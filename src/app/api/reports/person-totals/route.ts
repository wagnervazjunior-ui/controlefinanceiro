import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, categorySplits, people } from "../../../../db/schema";
import { computePersonTotals } from "../../../../lib/category-split";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const [txRows, splits, allPeople] = await Promise.all([
    monthId
      ? db.select().from(transactions).where(eq(transactions.monthId, Number(monthId)))
      : db.select().from(transactions),
    db.select().from(categorySplits),
    db.select().from(people),
  ]);

  const mainPerson = allPeople.find((p) => p.isMain);

  const totals = computePersonTotals(
    txRows.map((t) => ({ categoryId: t.categoryId, amount: Number(t.amount) })),
    splits.map((s) => ({ categoryId: s.categoryId, personId: s.personId, percentage: Number(s.percentage) })),
    mainPerson?.id
  );

  const result = totals.map(({ personId, total }) => {
    const person = allPeople.find((p) => p.id === personId);
    return { personId, personName: person?.name ?? "Desconhecido", total, isMain: person?.isMain ?? false };
  });

  return NextResponse.json(result);
}
