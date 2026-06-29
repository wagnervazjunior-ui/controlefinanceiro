import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, categories } from "../../../../db/schema";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const query = db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .groupBy(transactions.categoryId, categories.name);

  const rows = monthId
    ? await query.where(eq(transactions.monthId, Number(monthId)))
    : await query;

  return NextResponse.json(rows);
}
