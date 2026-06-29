export function validateSplitsSumTo100(splits: { percentage: number }[]): boolean {
  const total = splits.reduce((sum, s) => sum + s.percentage, 0);
  return Math.abs(total - 100) <= 0.02;
}
