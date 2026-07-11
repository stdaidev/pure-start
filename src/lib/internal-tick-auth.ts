import { createHash, timingSafeEqual } from "node:crypto";

type TickEnvironment = {
  INTERNAL_TICK_TOKEN?: string;
  WEBHOOK_VERIFY_TOKEN?: string;
};

function constantTimeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function readTickCredential(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return (request.headers.get("x-internal-token") ?? request.headers.get("apikey") ?? "").trim();
}

export function authorizeInternalTick(
  request: Request,
  env: TickEnvironment = process.env,
): "authorized" | "unauthorized" | "misconfigured" {
  const expected = env.INTERNAL_TICK_TOKEN?.trim() || env.WEBHOOK_VERIFY_TOKEN?.trim() || "";
  if (!expected) return "misconfigured";
  const provided = readTickCredential(request);
  if (!provided || !constantTimeEqual(provided, expected)) return "unauthorized";
  return "authorized";
}
