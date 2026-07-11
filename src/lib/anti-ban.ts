/**
 * F6 T4 - Utilitarios puros de anti-ban.
 * Sem dependencia de Date global fora dos parametros para facilitar teste.
 */

export type Window = { start: string; end: string };

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.NaN;
  return h * 60 + m;
}

/**
 * Retorna HH:MM (0-1439) do horario local em America/Sao_Paulo para o Date dado.
 */
export function minutesInSaoPaulo(now: Date): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const h = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = Number.parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return h * 60 + m;
}

/**
 * YYYY-MM-DD em America/Sao_Paulo.
 */
export function dateKeySaoPaulo(now: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

export function isWithinWindow(now: Date, window: Window): boolean {
  const cur = minutesInSaoPaulo(now);
  const start = parseHHMM(window.start);
  const end = parseHHMM(window.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (start <= end) return cur >= start && cur < end;
  // Janela cruza meia-noite.
  return cur >= start || cur < end;
}

export function nextDelayMs(
  minMs: number,
  maxMs: number,
  rand: () => number = Math.random,
): number {
  const lo = Math.max(0, Math.min(minMs, maxMs));
  const hi = Math.max(minMs, maxMs);
  if (hi <= lo) return lo;
  const unit = Math.max(0, Math.min(1 - Number.EPSILON, rand()));
  return Math.floor(lo + unit * (hi - lo + 1));
}

/**
 * Calcula o teto efetivo do dia considerando warm-up (opcional).
 * warmupPerDay: incremento por dia desde `startedAt`. Dia 1 = warmupPerDay.
 */
export function effectiveCap(params: {
  dailyCap: number;
  warmupPerDay?: number | null;
  startedAt?: Date | null;
  now: Date;
}): number {
  const { dailyCap, warmupPerDay, startedAt, now } = params;
  if (!warmupPerDay || !startedAt) return dailyCap;
  const startKey = dateKeySaoPaulo(startedAt);
  const nowKey = dateKeySaoPaulo(now);
  // Diferenca em dias via UTC no meio-dia para evitar DST edge.
  const s = new Date(`${startKey}T12:00:00Z`).getTime();
  const n = new Date(`${nowKey}T12:00:00Z`).getTime();
  const days = Math.max(0, Math.round((n - s) / 86_400_000));
  const capForDay = warmupPerDay * (days + 1);
  return Math.min(dailyCap, capForDay);
}

/**
 * Quantos envios ainda cabem hoje. Reseta se `sentTodayDate` != hoje.
 */
export function dailyCapRemaining(params: {
  dailyCap: number;
  warmupPerDay?: number | null;
  startedAt?: Date | null;
  sentToday: number;
  sentTodayDate: string | null;
  now: Date;
}): number {
  const todayKey = dateKeySaoPaulo(params.now);
  const used = params.sentTodayDate && params.sentTodayDate === todayKey ? params.sentToday : 0;
  const cap = effectiveCap({
    dailyCap: params.dailyCap,
    warmupPerDay: params.warmupPerDay,
    startedAt: params.startedAt,
    now: params.now,
  });
  return Math.max(0, cap - used);
}
