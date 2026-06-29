export function validateSplitsSumTo100(splits: { percentage: number }[]): boolean {
  const total = splits.reduce((sum, s) => sum + s.percentage, 0);
  return Math.abs(total - 100) <= 0.02;
}

export function computePersonTotals(
  transactions: { categoryId: number | null; amount: number }[],
  splits: { categoryId: number; personId: number; percentage: number }[]
): { personId: number; total: number }[] {
  const totalsByPerson = new Map<number, number>();

  for (const tx of transactions) {
    if (tx.categoryId === null) continue;
    const relevantSplits = splits.filter((s) => s.categoryId === tx.categoryId);
    for (const split of relevantSplits) {
      const share = tx.amount * (split.percentage / 100);
      totalsByPerson.set(split.personId, (totalsByPerson.get(split.personId) ?? 0) + share);
    }
  }

  return Array.from(totalsByPerson.entries()).map(([personId, total]) => ({ personId, total }));
}
