/**
 * Contrato client-safe para provedores de LLM.
 * Implementacoes concretas ficam em `*.server.ts` (nao importar deste arquivo
 * modulos server-only). Aqui so tipos, sem side-effects.
 */

export type LlmRole = "system" | "user" | "assistant" | "tool";

export interface LlmMessage {
  role: LlmRole;
  content: string;
  /** Opcional: id da tool_call que originou uma mensagem role="tool". */
  toolCallId?: string;
  /** Opcional: nome da tool para mensagens role="tool". */
  name?: string;
  /** Opcional: tool_calls emitidos pelo assistant nesta mensagem. */
  toolCalls?: LlmToolCall[];
}

export interface LlmToolSpec {
  name: string;
  description: string;
  /** JSON Schema dos parametros (subset compativel com OpenAI functions). */
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  /** Argumentos ja parseados (JSON.parse do arguments string). */
  arguments: Record<string, unknown>;
}

export interface LlmCompleteInput {
  model: string;
  system?: string;
  messages: LlmMessage[];
  tools?: LlmToolSpec[];
  temperature?: number;
  maxTokens?: number;
  /** Timeout em ms para a chamada externa. */
  timeoutMs?: number;
}

export interface LlmCompleteResult {
  /** Texto final do assistant (pode ser vazio se so houve tool_calls). */
  text: string;
  toolCalls: LlmToolCall[];
  /** Motivo do stop segundo o provedor (stop, length, tool_calls, ...). */
  finishReason: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LlmProvider {
  readonly id: LlmProviderId;
  complete(input: LlmCompleteInput): Promise<LlmCompleteResult>;
}

export type LlmProviderId = "openai";
