export function formatBRL(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
