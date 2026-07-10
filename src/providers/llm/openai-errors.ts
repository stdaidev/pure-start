export type OpenAiErrorCode =
  | "openai_timeout"
  | "openai_rate_limited"
  | "openai_bad_request"
  | "openai_unauthorized"
  | "openai_server_error"
  | "openai_network_error"
  | "openai_unknown";

export class OpenAiError extends Error {
  readonly code: OpenAiErrorCode;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(code: OpenAiErrorCode, options: { status?: number; retryable: boolean }) {
    super(code);
    this.name = "OpenAiError";
    this.code = code;
    this.status = options.status;
    this.retryable = options.retryable;
  }
}

export function openAiErrorFromStatus(status: number): OpenAiError {
  if (status === 429) {
    return new OpenAiError("openai_rate_limited", { status, retryable: true });
  }
  if (status >= 500) {
    return new OpenAiError("openai_server_error", { status, retryable: true });
  }
  if (status === 401 || status === 403) {
    return new OpenAiError("openai_unauthorized", { status, retryable: false });
  }
  if (status >= 400 && status < 500) {
    return new OpenAiError("openai_bad_request", { status, retryable: false });
  }
  return new OpenAiError("openai_unknown", { status, retryable: false });
}

export function openAiRetryDelayMs(retryIndex: number): number {
  return retryIndex <= 0 ? 200 : 500;
}
