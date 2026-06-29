export function buildInstallmentGroupKey(input: {
  description: string;
  installmentTotal: number;
}): string {
  const normalizedDescription = input.description.trim().toUpperCase();
  return `${normalizedDescription}|${input.installmentTotal}`;
}
