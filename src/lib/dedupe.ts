export function buildDedupeKey(input: {
  date: string;
  description: string;
  amount: number;
  source: string;
}): string {
  const normalizedDescription = input.description.trim().toUpperCase();
  return `${input.source}|${input.date}|${normalizedDescription}|${input.amount.toFixed(2)}`;
}
