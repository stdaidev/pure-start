/**
 * F6 T3 - Renderizador puro de template.
 * Substitui `{{coluna}}` por vars[coluna] (case-insensitive, trim).
 * Reporta placeholders faltantes.
 */

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_\-\s]+?)\s*\}\}/g;

export type RenderResult = {
  text: string;
  missing: string[];
};

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

export function extractPlaceholders(template: string): string[] {
  const set = new Set<string>();
  for (const m of template.matchAll(PLACEHOLDER_RE)) {
    set.add(m[1].trim());
  }
  return Array.from(set);
}

export function renderTemplate(template: string, vars: Record<string, unknown>): RenderResult {
  const lookup = new Map<string, string>();
  for (const [k, v] of Object.entries(vars ?? {})) {
    if (v === null || v === undefined) continue;
    lookup.set(normalizeKey(k), String(v));
  }
  const missing = new Set<string>();
  const text = template.replace(PLACEHOLDER_RE, (_full, rawKey: string) => {
    const key = normalizeKey(rawKey);
    const val = lookup.get(key);
    if (val === undefined || val === "") {
      missing.add(rawKey.trim());
      return "";
    }
    return val;
  });
  return { text, missing: Array.from(missing) };
}
