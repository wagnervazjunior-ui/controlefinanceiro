import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../../db/client";
import { incomes } from "../../../../db/schema";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const query = db
    .select({
      personId: incomes.personId,
      total: sql<string>`sum(${incomes.amount})`,
    })
    .from(incomes)
    .groupBy(incomes.personId);

  const rows = monthId
    ? await query.where(eq(incomes.monthId, Number(monthId)))
    : await query;

  return NextResponse.json(
    rows.map((r) => ({ personId: r.personId, total: Number(r.total) }))
  );
}
