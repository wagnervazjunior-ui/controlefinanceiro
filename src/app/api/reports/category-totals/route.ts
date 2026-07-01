import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, categories } from "../../../../db/schema";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  // Normalize sign so an expense is always positive: card faturas store
  // purchases as positive, but bank-statement (extrato) debits are negative,
  // so flip extrato amounts.
  const total = sql<string>`sum(case when ${transactions.bankAccountId} is not null then -${transactions.amount} else ${transactions.amount} end)`;

  // Exclude categories flagged out of reports (e.g. "Pagamento de fatura")
  // to avoid double-counting the card bill payment against its purchases.
  const notExcluded = sql`(${categories.excludeFromReports} is null or ${categories.excludeFromReports} = false)`;

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
    ? await query.where(and(eq(transactions.monthId, Number(monthId)), notExcluded))
    : await query.where(notExcluded);

  return NextResponse.json(rows);
}
