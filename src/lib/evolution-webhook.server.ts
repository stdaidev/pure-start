const WEBHOOK_PATH = "/api/public/evolution/webhook";
const DEFAULT_PUBLISHED_BASE = "https://light-springboard.lovable.app";

function stripWebhookToken(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete("token");
    url.searchParams.delete("x-webhook-token");
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function getPublicEvolutionWebhookUrl(): string {
  // Sempre usa a URL publicada. Evolution nao consegue entregar em preview/localhost.
  const configuredBase =
    process.env.PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim() || DEFAULT_PUBLISHED_BASE;
  const normalized = stripWebhookToken(new URL(configuredBase).toString()).replace(/\/+$/, "");
  return normalized.endsWith(WEBHOOK_PATH) ? normalized : `${normalized}${WEBHOOK_PATH}`;
}

export function getEvolutionWebhookDeliveryConfig(): {
  publicUrl: string;
  deliveryUrl: string;
  headers: Record<string, string>;
} {
  const publicUrl = getPublicEvolutionWebhookUrl();
  const token = process.env.WEBHOOK_VERIFY_TOKEN?.trim();
  if (!token) throw new Error("WEBHOOK_VERIFY_TOKEN not configured");
  const headers: Record<string, string> = { "x-webhook-token": token };
  return { publicUrl, deliveryUrl: publicUrl, headers };
}

export function sanitizeEvolutionWebhookPayload(raw: unknown): unknown {
  return sanitizeValue(raw, 0);
}

const SENSITIVE_KEY =
  /(api.?key|authorization|token|base64|caption|content|conversation|phone|remote.?jid|sender|owner|participant|text)/i;

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? value.slice(0, 160) : value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key) && typeof child !== "object") {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    if (key.toLowerCase() === "destination" && typeof child === "string") {
      sanitized[key] = stripWebhookToken(child).slice(0, 160);
      continue;
    }
    sanitized[key] = sanitizeValue(child, depth + 1);
  }
  return sanitized;
}
