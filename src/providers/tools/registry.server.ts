/**
 * Registry server-only de tools do agente.
 *
 * SEGURANCA:
 * - Executa APENAS handlers listados. Nunca eval/shell a partir de tool_call.
 * - Argumentos validados por schema Zod dentro de cada handler.
 * - Sem log de content. Erros retornam mensagem generica ao LLM.
 */

import { z } from "zod";
import type { LlmToolSpec } from "@/providers/llm/types";

export interface ToolContext {
  workspaceId: string;
  conversationId: string;
}

export interface ToolResult {
  ok: boolean;
  /** Texto curto retornado ao LLM como resposta da tool. */
  message: string;
}

export interface AgentTool {
  spec: LlmToolSpec;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

const resetArgs = z.object({});
const transferArgs = z.object({
  reason: z.string().max(500).optional(),
});

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const resetTool: AgentTool = {
  spec: {
    name: "resetar",
    description:
      "Limpa o historico efetivo da conversa (cria um marcador; mensagens anteriores sao ignoradas pelo agente).",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  async handler(rawArgs, ctx) {
    if (!resetArgs.safeParse(rawArgs).success) {
      return { ok: false, message: "argumentos invalidos" };
    }
    const admin = await getAdmin();
    const { error } = await admin.from("conversation_markers").insert({
      workspace_id: ctx.workspaceId,
      conversation_id: ctx.conversationId,
      kind: "reset",
    });
    if (error) return { ok: false, message: "falha ao resetar" };
    return { ok: true, message: "historico resetado" };
  },
};

const transferTool: AgentTool = {
  spec: {
    name: "transferir_humano",
    description:
      "Transfere a conversa para atendimento humano. O agente para de responder nesta conversa.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Motivo curto (opcional).",
        },
      },
      additionalProperties: false,
    },
  },
  async handler(rawArgs, ctx) {
    if (!transferArgs.safeParse(rawArgs).success) {
      return { ok: false, message: "argumentos invalidos" };
    }
    const admin = await getAdmin();
    const { error } = await admin
      .from("conversations")
      .update({ assigned_to: "human" })
      .eq("workspace_id", ctx.workspaceId)
      .eq("id", ctx.conversationId);
    if (error) return { ok: false, message: "falha ao transferir" };
    return { ok: true, message: "conversa transferida para humano" };
  },
};

const registry = new Map<string, AgentTool>([
  [resetTool.spec.name, resetTool],
  [transferTool.spec.name, transferTool],
]);

export function listToolSpecs(names?: string[]): LlmToolSpec[] {
  const src =
    names && names.length > 0
      ? names.map((n) => registry.get(n)).filter((t): t is AgentTool => !!t)
      : Array.from(registry.values());
  return src.map((t) => t.spec);
}

export function getTool(name: string): AgentTool | undefined {
  return registry.get(name);
}

export function listToolNames(): string[] {
  return Array.from(registry.keys());
}
