import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, categorySplits, people, categories, settlements } from "../../../../db/schema";
import { computePersonTotals } from "../../../../lib/category-split";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const [txRows, splits, allPeople, allCategories, allSettlements] = await Promise.all([
    monthId
      ? db.select().from(transactions).where(eq(transactions.monthId, Number(monthId)))
      : db.select().from(transactions),
    db.select().from(categorySplits),
    db.select().from(people),
    db.select().from(categories),
    monthId
      ? db.select().from(settlements).where(eq(settlements.monthId, Number(monthId)))
      : db.select().from(settlements),
  ]);

  const mainPerson = allPeople.find((p) => p.isMain);
  // Categories flagged out of reports (e.g. "Pagamento de fatura") are skipped
  // so the card bill payment isn't double-counted against its purchases.
  const excludedCategoryIds = new Set(
    allCategories.filter((c) => c.excludeFromReports).map((c) => c.id)
  );

  const totals = computePersonTotals(
    // Normalize sign so an expense is always positive: extrato debits are
    // negative, so flip them; card fatura purchases are already positive.
    txRows
      .filter((t) => t.categoryId == null || !excludedCategoryIds.has(t.categoryId))
      .map((t) => ({
        categoryId: t.categoryId,
        amount: t.bankAccountId != null ? -Number(t.amount) : Number(t.amount),
      })),
    splits.map((s) => ({ categoryId: s.categoryId, personId: s.personId, percentage: Number(s.percentage) })),
    mainPerson?.id
  );

  // Apply confirmed settlements: when a non-main person paid less than they
  // owed, the unpaid difference moves to the main person (they absorbed it).
  const totalsMap = new Map(totals.map((t) => [t.personId, t.total]));
  if (mainPerson) {
    for (const s of allSettlements) {
      if (!s.confirmed) continue;
      const owedByPerson = totalsMap.get(s.personId) ?? 0;
      const difference = owedByPerson - Number(s.paidAmount);
      if (difference > 0) {
        totalsMap.set(s.personId, owedByPerson - difference);
        totalsMap.set(mainPerson.id, (totalsMap.get(mainPerson.id) ?? 0) + difference);
      }
    }
  }

  const result = [...totalsMap.entries()].map(([personId, total]) => {
    const person = allPeople.find((p) => p.id === personId);
    return { personId, personName: person?.name ?? "Desconhecido", total, isMain: person?.isMain ?? false };
  });

  return NextResponse.json(result);
}
