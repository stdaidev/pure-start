/**
 * OpenAIProvider server-only.
 *
 * SEGURANCA:
 * - `OPENAI_API_KEY` lido de process.env DENTRO da funcao (nunca no bundle client).
 * - Nenhum log de `content` de mensagem. Apenas ids opacos e metadados numericos.
 * - Timeout hard via AbortController (default 12s).
 * - `max_tokens` so e enviado quando configurado; o runtime limita rounds de tools.
 */

import { registerLlmProvider } from "./registry.ts";
import type { LlmCompleteInput, LlmCompleteResult, LlmProvider, LlmToolCall } from "./types";
import { OpenAiError, openAiErrorFromStatus, openAiRetryDelayMs } from "./openai-errors.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;

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
    } else if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      out.push({
        role: "assistant",
        content: m.content ?? "",
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments ?? {}),
          },
        })),
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeOpenAiError(error: unknown): OpenAiError {
  if (error instanceof OpenAiError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new OpenAiError("openai_timeout", { retryable: true });
  }
  if (error instanceof TypeError) {
    return new OpenAiError("openai_network_error", { retryable: true });
  }
  return new OpenAiError("openai_unknown", { retryable: false });
}

export async function completeOpenAi(
  input: LlmCompleteInput,
  apiKey: string,
  dependencies: {
    fetchImpl?: typeof fetch;
    sleepImpl?: (ms: number) => Promise<void>;
  } = {},
): Promise<LlmCompleteResult> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const sleepImpl = dependencies.sleepImpl ?? sleep;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetchImpl(OPENAI_URL, {
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
          ...(input.maxTokens !== undefined ? { max_tokens: input.maxTokens } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw openAiErrorFromStatus(res.status);

      const data = (await res.json()) as OpenAiResponse;
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!choice || !msg) {
        throw new OpenAiError("openai_unknown", { retryable: false });
      }

      const toolCalls: LlmToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: safeParseArgs(tc.function.arguments),
      }));

      return {
        text: msg.content ?? "",
        toolCalls,
        finishReason: choice.finish_reason ?? "stop",
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      const normalized = normalizeOpenAiError(error);
      if (!normalized.retryable || attempt >= MAX_RETRIES) throw normalized;
      await sleepImpl(openAiRetryDelayMs(attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new OpenAiError("openai_unknown", { retryable: false });
}

export const openaiProvider: LlmProvider = {
  id: "openai",
  async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
    // F7 T3: prefere DB (workspace_secrets), fallback process.env.
    const { getSecret } = await import("@/lib/secrets.server");
    const apiKey = await getSecret("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    return completeOpenAi(input, apiKey);
  },
};

registerLlmProvider(openaiProvider);
