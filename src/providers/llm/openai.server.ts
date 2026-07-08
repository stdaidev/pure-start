/**
 * OpenAIProvider server-only.
 *
 * SEGURANCA:
 * - `OPENAI_API_KEY` lido de process.env DENTRO da funcao (nunca no bundle client).
 * - Nenhum log de `content` de mensagem. Apenas ids opacos e metadados numericos.
 * - Timeout hard via AbortController (default 12s).
 * - `max_tokens` cap default 800 para conter custo.
 */

import { registerLlmProvider } from "./registry";
import type {
  LlmCompleteInput,
  LlmCompleteResult,
  LlmProvider,
  LlmToolCall,
} from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_TOKENS = 800;

interface OpenAiChoiceMessage {
  role: string;
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

interface OpenAiResponse {
  choices: Array<{
    message: OpenAiChoiceMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function toOpenAiMessages(input: LlmCompleteInput) {
  const out: Array<Record<string, unknown>> = [];
  if (input.system) out.push({ role: "system", content: input.system });
  for (const m of input.messages) {
    if (m.role === "tool") {
      out.push({
        role: "tool",
        content: m.content,
        tool_call_id: m.toolCallId ?? "",
      });
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

function toOpenAiTools(input: LlmCompleteInput) {
  if (!input.tools || input.tools.length === 0) return undefined;
  return input.tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const openaiProvider: LlmProvider = {
  id: "openai",
  async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    try {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: input.model,
          messages: toOpenAiMessages(input),
          tools: toOpenAiTools(input),
          temperature: input.temperature ?? 0.7,
          // Se input.maxTokens for undefined, nao envia (ilimitado / default do modelo).
          ...(input.maxTokens !== undefined
            ? { max_tokens: input.maxTokens }
            : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Nao loga corpo (pode conter echo do prompt).
        throw new Error(`openai http ${res.status}`);
      }

      const data = (await res.json()) as OpenAiResponse;
      const choice = data.choices?.[0];
      const msg = choice?.message;

      const toolCalls: LlmToolCall[] = (msg?.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: safeParseArgs(tc.function.arguments),
      }));

      return {
        text: msg?.content ?? "",
        toolCalls,
        finishReason: choice?.finish_reason ?? "stop",
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (err) {
      const name = (err as Error).name;
      if (name === "AbortError") throw new Error("openai timeout");
      // Mensagem generica; nao vaza payload.
      throw new Error(`openai error: ${name}`);
    } finally {
      clearTimeout(timeout);
    }
  },
};

registerLlmProvider(openaiProvider);