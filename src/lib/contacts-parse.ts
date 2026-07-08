import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string>[];
};

/** Parse CSV no client. */
export async function parseCsv(file: File): Promise<ParsedSheet> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).filter(Boolean);
  const rows = (result.data ?? []).map((row) => {
    const clean: Record<string, string> = {};
    for (const h of headers) {
      const v = row[h];
      clean[h] = v == null ? "" : String(v).trim();
    }
    return clean;
  });
  return { headers, rows };
}

/** Parse XLSX no client (SheetJS). */
export async function parseXlsx(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return { headers: [], rows: [] };
  const sheet = wb.Sheets[first];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  const headers: string[] = [];
  for (const row of json) {
    for (const key of Object.keys(row)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }
  const rows = json.map((row) => {
    const clean: Record<string, string> = {};
    for (const h of headers) {
      const v = row[h];
      clean[h] = v == null ? "" : String(v).trim();
    }
    return clean;
  });
  return { headers, rows };
}

export async function parseSheet(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(file);
  return parseXlsx(file);
}

export type FieldRole =
  | "name"
  | "phone"
  | "email"
  | "tags"
  | "placeholder"
  | "ignorar";

/** Sugere role para cada header baseado em nomes comuns. */
export function suggestMapping(headers: string[]): Record<string, FieldRole> {
  const map: Record<string, FieldRole> = {};
  for (const h of headers) {
    const key = h.toLowerCase().trim();
    if (/(telefone|celular|whats|phone|numero|número)/.test(key)) {
      map[h] = "phone";
    } else if (/(nome|name|contato)/.test(key)) {
      map[h] = "name";
    } else if (/(email|e-mail)/.test(key)) {
      map[h] = "email";
    } else if (/(tag|etiqueta|segmento)/.test(key)) {
      map[h] = "tags";
    } else {
      map[h] = "placeholder";
    }
  }
  return map;
}