/**
 * F7 - Helper de leitura de secrets por workspace (server-only).
 *
 * Ordem de resolucao:
 *   1) DB `workspace_secrets` (workspace_id, name)
 *   2) fallback `process.env[name]`
 *
 * Cache in-memory com TTL curto (30s) para evitar 1 query por request.
 * Trade-off: mudanca de secret aplica no proximo ciclo do TTL.
 *
 * SEGURANCA:
 * - So importar em arquivos .server.ts (import protection).
 * - Nunca logar o valor retornado.
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";
const TTL_MS = 30_000;

type CacheEntry = { value: string | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(workspaceId: string, name: string) {
  return `${workspaceId}::${name}`;
}

export async function getSecret(
  name: string,
  workspaceId: string = DEFAULT_WORKSPACE,
): Promise<string | undefined> {
  const key = cacheKey(workspaceId, name);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value ?? process.env[name] ?? undefined;
  }

  let dbValue: string | null = null;
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data } = await supabaseAdmin
      .from("workspace_secrets")
      .select("value")
      .eq("workspace_id", workspaceId)
      .eq("name", name)
      .maybeSingle();
    dbValue = (data?.value as string | undefined) ?? null;
  } catch {
    // silencioso: cai para env
  }

  cache.set(key, { value: dbValue, expiresAt: now + TTL_MS });
  return dbValue ?? process.env[name] ?? undefined;
}

/** Invalida cache local — usar apos upsert do secret. */
export function invalidateSecretCache(
  name: string,
  workspaceId: string = DEFAULT_WORKSPACE,
) {
  cache.delete(cacheKey(workspaceId, name));
}

/** Mascara curta para exibir na UI: retorna ****XXXX (ultimos 4 chars). */
export function maskSecret(value: string): string {
  const tail = value.slice(-4);
  return `****${tail}`;
}