/**
 * Normaliza telefone para formato E.164 sem `+`. Assume Brasil quando
 * o numero limpo tem 10 ou 11 digitos (sem DDI). Retorna null se invalido.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return digits;
  return null;
}

/**
 * Variantes brasileiras observadas em JIDs/integrações: com/sem DDI 55 e
 * com/sem nono dígito. A lista é determinística e sem duplicatas.
 */
export function phoneVariantsBR(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return [];

  const variants = new Set<string>([digits]);
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  variants.add(local);
  variants.add(`55${local}`);

  if (local.length === 11 && local[2] === "9") {
    const withoutNinthDigit = local.slice(0, 2) + local.slice(3);
    variants.add(withoutNinthDigit);
    variants.add(`55${withoutNinthDigit}`);
  } else if (local.length === 10) {
    const withNinthDigit = local.slice(0, 2) + "9" + local.slice(2);
    variants.add(withNinthDigit);
    variants.add(`55${withNinthDigit}`);
  }

  return Array.from(variants);
}

export function snakeCase(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
