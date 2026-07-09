/**
 * Runtime do agente server-only.
 *
 * SEGURANCA:
 * - Nunca loga content de mensagem. So ids opacos e contagens.
 * - Guards: ignora outbound (evita loop bot->bot), respeita assigned_to != null
 *   (humano assumiu) e agents.active=false.
 * - Cap total humanizacao 12s; timeout LLM 12s.
 * - Tools executadas apenas via registry (sem eval/shell).
 */

import type {
  LlmMessage,
  LlmProvider,
  LlmToolSpec,
} from "@/providers/llm/types";

const HISTORY_LIMIT = 20;
const DEFAULT_MAX_TOOL_ROUNDS = 2;
const HARD_MAX_TOOL_ROUNDS = 20; // teto de seguranca mesmo com "ilimitado"
const HUMANIZE_HARD_CAP_MS = 12_000;
const RESET_COMMAND = "/resetar";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function splitIntoChunks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Divide por fim de frase; agrupa curtos.
  const parts = trimmed
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + " " + p).trim().length < 80) {
      buf = (buf + " " + p).trim();
    } else {
      if (buf) chunks.push(buf);
      buf = p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks.length > 0 ? chunks : [trimmed];
}

function chunkDelay(chunk: string, minMs: number, maxMs: number): number {
  // ~40 chars/segundo com jitter, clamp em [min, max].
  const base = Math.round((chunk.length / 40) * 1000);
  const jitter = Math.round(minMs * 0.4 * Math.random());
  return Math.max(minMs, Math.min(maxMs, base + jitter));
}

interface HumanizationConfig {
  chunk: boolean;
  min_ms: number;
  max_ms: number;
}

function parseHumanization(raw: unknown): HumanizationConfig {
  const obj = (raw ?? {}) as Partial<HumanizationConfig>;
  return {
    chunk: obj.chunk ?? true,
    min_ms: typeof obj.min_ms === "number" ? obj.min_ms : 800,
    max_ms: typeof obj.max_ms === "number" ? obj.max_ms : 3500,
  };
}

function parseToolNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

export interface RunAgentResult {
  status:
    | "ok"
    | "skipped-outbound"
    | "skipped-human"
    | "skipped-inactive"
    | "skipped-no-agent"
    | "skipped-reset"
    | "skipped-no-content"
    | "skipped-no-connection"
    | "skipped-locked"
    | "error";
  reason?: string;
  outboundIds?: string[];
}

export async function runAgentForMessage(
  messageId: string,
): Promise<RunAgentResult> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { getLlmProvider } = await import("@/providers/llm/registry");
  const { getTool, listToolSpecs } = await import(
    "@/providers/tools/registry.server"
  );
  // Auto-registra provedores
  await import("@/providers/llm/openai.server");
  const { evolutionProvider } = await import(
    "@/providers/channel/evolution.server"
  );

  const { data: msg } = await supabaseAdmin
    .from("messages")
    .select(
      "id, workspace_id, conversation_id, direction, content, external_id",
    )
    .eq("id", messageId)
    .maybeSingle();
  if (!msg) return { status: "error", reason: "message not found" };
  const content = (msg.content ?? "").trim();
  if (msg.direction !== "inbound") return { status: "skipped-outbound" };
  if (!content) return { status: "skipped-no-content" };

  // Comando textual /resetar: cria marker e sai.
  if (content.toLowerCase() === RESET_COMMAND) {
    await supabaseAdmin.from("conversation_markers").insert({
      workspace_id: msg.workspace_id,
      conversation_id: msg.conversation_id,
      kind: "reset",
    });
    return { status: "skipped-reset" };
  }

  const { data: conv } = await supabaseAdmin
    .from("conversations")
    .select("id, agent_id, assigned_to, connection_id, contact_id")
    .eq("id", msg.conversation_id)
    .maybeSingle();
  if (!conv) return { status: "error", reason: "conversation not found" };
  if (conv.assigned_to) return { status: "skipped-human" };
  if (!conv.agent_id) return { status: "skipped-no-agent" };
  if (!conv.connection_id || !conv.contact_id) {
    return { status: "skipped-no-connection" };
  }

  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select(
      "id, active, model, temperature, system_prompt, tools, humanization, max_tokens, max_tool_rounds",
    )
    .eq("id", conv.agent_id)
    .maybeSingle();
  if (!agent) return { status: "skipped-no-agent" };
  if (!agent.active) return { status: "skipped-inactive" };

  const { data: contact } = await supabaseAdmin
    .from("contacts")
    .select("phone")
    .eq("id", conv.contact_id)
    .maybeSingle();
  const { data: connection } = await supabaseAdmin
    .from("connections")
    .select("instance_name")
    .eq("id", conv.connection_id)
    .maybeSingle();
  if (!contact?.phone || !connection?.instance_name) {
    return { status: "skipped-no-connection" };
  }

  // Historico apos ultimo marker de reset.
  const { data: lastReset } = await supabaseAdmin
    .from("conversation_markers")
    .select("created_at")
    .eq("conversation_id", conv.id)
    .eq("kind", "reset")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let historyQuery = supabaseAdmin
    .from("messages")
    .select("direction, content, created_at")
    .eq("conversation_id", conv.id)
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (lastReset?.created_at) {
    historyQuery = historyQuery.gt("created_at", lastReset.created_at);
  }
  const { data: history } = await historyQuery;
  const ordered = (history ?? []).slice().reverse();

  const llmMessages: LlmMessage[] = ordered.map((h) => ({
    role: h.direction === "outbound" ? "assistant" : "user",
    content: h.content ?? "",
  }));

  const toolNames = parseToolNames(agent.tools);
  const toolSpecs: LlmToolSpec[] = toolNames.length > 0
    ? listToolSpecs(toolNames)
    : [];

  const provider: LlmProvider = getLlmProvider("openai");

  const started = Date.now();
  const roundsLimit =
    agent.max_tool_rounds == null
      ? DEFAULT_MAX_TOOL_ROUNDS
      : Math.min(agent.max_tool_rounds, HARD_MAX_TOOL_ROUNDS);
  let finalText = "";
  let rounds = 0;

  while (rounds < roundsLimit) {
    rounds += 1;
    const res = await provider.complete({
      model: agent.model,
      system: agent.system_prompt,
      messages: llmMessages,
      tools: toolSpecs.length > 0 ? toolSpecs : undefined,
      temperature: agent.temperature,
      // null no banco = "ilimitado" (nao envia max_tokens para o provedor)
      maxTokens: agent.max_tokens ?? undefined,
      timeoutMs: 12_000,
    });

    if (res.toolCalls.length === 0) {
      finalText = res.text;
      break;
    }

    // Executa tools sequencialmente e alimenta o loop.
    llmMessages.push({
      role: "assistant",
      content: res.text ?? "",
      toolCalls: res.toolCalls,
    });
    let stopAfter = false;
    for (const call of res.toolCalls) {
      const tool = getTool(call.name);
      if (!tool) {
        llmMessages.push({
          role: "tool",
          content: "tool nao encontrada",
          toolCallId: call.id,
          name: call.name,
        });
        continue;
      }
      const out = await tool.handler(call.arguments, {
        workspaceId: msg.workspace_id,
        conversationId: conv.id,
      });
      llmMessages.push({
        role: "tool",
        content: out.message,
        toolCallId: call.id,
        name: call.name,
      });
      if (call.name === "transferir_humano" && out.ok) stopAfter = true;
    }
    if (stopAfter) return { status: "skipped-human" };
  }

  finalText = (finalText ?? "").trim();
  if (!finalText) return { status: "skipped-no-content" };

  // Humanizacao + envio
  const cfg = parseHumanization(agent.humanization);
  const chunks = cfg.chunk ? splitIntoChunks(finalText) : [finalText];
  const outboundIds: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const budget = HUMANIZE_HARD_CAP_MS - (Date.now() - started);
    if (budget <= 0 && i > 0) break;
    const d = Math.min(
      chunkDelay(chunks[i], cfg.min_ms, cfg.max_ms),
      Math.max(600, budget),
    );
    if (evolutionProvider.sendTyping) {
      await evolutionProvider.sendTyping(
        connection.instance_name,
        contact.phone,
        d,
      );
    }
    await sleep(d);
    let providerMessageId: string;
    try {
      const sent = await evolutionProvider.sendText(connection.instance_name, {
        to: contact.phone,
        text: chunks[i],
      });
      providerMessageId = sent.providerMessageId;
    } catch {
      return { status: "error", reason: "send failed", outboundIds };
    }

    const { data: inserted } = await supabaseAdmin
      .from("messages")
      .insert({
        workspace_id: msg.workspace_id,
        conversation_id: conv.id,
        direction: "outbound",
        content: chunks[i],
        status: "sent",
        external_id: providerMessageId,
      })
      .select("id")
      .single();
    if (inserted) outboundIds.push(inserted.id);

    await supabaseAdmin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conv.id);
  }

  return { status: "ok", outboundIds };
}