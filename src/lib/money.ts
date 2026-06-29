export function parseBrazilianAmount(raw: string): number {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) {
    throw new Error(`Cannot parse amount: "${raw}"`);
  }
  return value;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value).replace(/ /g, " ");
}
