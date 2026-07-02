import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, categories, categorySplits, people } from "../../../../db/schema";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const [txRows, allCategories, splits, allPeople] = await Promise.all([
    monthId
      ? db.select().from(transactions).where(eq(transactions.monthId, Number(monthId)))
      : db.select().from(transactions),
    db.select().from(categories),
    db.select().from(categorySplits),
    db.select().from(people),
  ]);

  const mainPerson = allPeople.find((p) => p.isMain);
  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  // personId -> (categoryId -> total)
  const byPerson = new Map<number, Map<number, number>>();
  for (const p of allPeople) byPerson.set(p.id, new Map());

  for (const tx of txRows) {
    if (tx.categoryId == null) continue;
    const category = categoryById.get(tx.categoryId);
    if (!category || category.excludeFromReports) continue;

    // Normalize sign so expenses are positive (extrato debits are negative).
    const amount = tx.bankAccountId != null ? -Number(tx.amount) : Number(tx.amount);

    // Ignore 0% splits — the transaction shouldn't show in that person's report.
    const relevant = splits.filter((s) => s.categoryId === tx.categoryId && Number(s.percentage) > 0);
    const distribution =
      relevant.length > 0
        ? relevant.map((s) => ({ personId: s.personId, pct: Number(s.percentage) }))
        : mainPerson
        ? [{ personId: mainPerson.id, pct: 100 }]
        : [];

    for (const { personId, pct } of distribution) {
      const catMap = byPerson.get(personId);
      if (!catMap) continue;
      catMap.set(tx.categoryId, (catMap.get(tx.categoryId) ?? 0) + amount * (pct / 100));
    }
  }

  const result = allPeople.map((p) => {
    const catMap = byPerson.get(p.id)!;
    const categoriesList = [...catMap.entries()]
      .map(([categoryId, total]) => ({
        categoryId,
        categoryName: categoryById.get(categoryId)?.name ?? "Sem categoria",
        total: Number(total.toFixed(2)),
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
    const total = categoriesList.reduce((s, c) => s + c.total, 0);
    return { personId: p.id, personName: p.name, isMain: p.isMain, total: Number(total.toFixed(2)), categories: categoriesList };
  });

  return NextResponse.json(result.filter((r) => r.categories.length > 0));
}
