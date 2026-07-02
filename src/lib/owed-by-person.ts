import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { transactions, categories, categorySplits } from "../db/schema";

/**
 * Computes how much each person owes for a given month, based on category
 * splits (100% to the main person when a category has no split). Extrato
 * debits are normalized to positive expenses; excluded categories are ignored.
 * Returns a Map of personId -> total owed.
 */
export async function computeOwedByPerson(
  monthId: number | null,
  mainPersonId: number | undefined
): Promise<Map<number, number>> {
  const [txRows, allCategories, splits] = await Promise.all([
    monthId
      ? db.select().from(transactions).where(eq(transactions.monthId, monthId))
      : db.select().from(transactions),
    db.select().from(categories),
    db.select().from(categorySplits),
  ]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const owed = new Map<number, number>();

  for (const tx of txRows) {
    if (tx.categoryId == null) continue;
    const category = categoryById.get(tx.categoryId);
    if (!category || category.excludeFromReports) continue;

    const amount = tx.bankAccountId != null ? -Number(tx.amount) : Number(tx.amount);

    const relevant = splits.filter((s) => s.categoryId === tx.categoryId && Number(s.percentage) > 0);
    const distribution =
      relevant.length > 0
        ? relevant.map((s) => ({ personId: s.personId, pct: Number(s.percentage) }))
        : mainPersonId != null
        ? [{ personId: mainPersonId, pct: 100 }]
        : [];

    for (const { personId, pct } of distribution) {
      owed.set(personId, (owed.get(personId) ?? 0) + amount * (pct / 100));
    }
  }

  return owed;
}
