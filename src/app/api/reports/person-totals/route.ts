import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, categorySplits } from "../../../../db/schema";
import { computePersonTotals } from "../../../../lib/category-split";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const txRows = monthId
    ? await db.select().from(transactions).where(eq(transactions.monthId, Number(monthId)))
    : await db.select().from(transactions);

  const splits = await db.select().from(categorySplits);

  const totals = computePersonTotals(
    txRows.map((t) => ({ categoryId: t.categoryId, amount: Number(t.amount) })),
    splits.map((s) => ({ categoryId: s.categoryId, personId: s.personId, percentage: Number(s.percentage) }))
  );

  return NextResponse.json(totals);
}
