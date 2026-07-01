import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, categories } from "../../../../db/schema";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  // Normalize sign so an expense is always positive: card faturas store
  // purchases as positive, but bank-statement (extrato) debits are negative,
  // so flip extrato amounts.
  const total = sql<string>`sum(case when ${transactions.bankAccountId} is not null then -${transactions.amount} else ${transactions.amount} end)`;

  const query = db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      total,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .groupBy(transactions.categoryId, categories.name);

  const rows = monthId
    ? await query.where(eq(transactions.monthId, Number(monthId)))
    : await query;

  return NextResponse.json(rows);
}
