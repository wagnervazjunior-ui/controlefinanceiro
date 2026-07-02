import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../db/client";
import { incomes, people, months } from "../../../db/schema";

async function getOrCreateMonth(year: number, month: number) {
  const existing = await db
    .select()
    .from(months)
    .where(and(eq(months.year, year), eq(months.month, month)));
  if (existing[0]) return existing[0];
  const [created] = await db.insert(months).values({ year, month }).returning();
  return created;
}

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const rows = await db
    .select({
      id: incomes.id,
      personId: incomes.personId,
      personName: people.name,
      monthId: incomes.monthId,
      description: incomes.description,
      amount: incomes.amount,
      date: incomes.date,
    })
    .from(incomes)
    .leftJoin(people, eq(incomes.personId, people.id))
    .where(monthId ? eq(incomes.monthId, Number(monthId)) : undefined)
    .orderBy(desc(incomes.date));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { personId, description, amount, referenceYear, referenceMonth } = body;
  if (!personId || !description || amount == null || !referenceYear || !referenceMonth) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }
  const month = await getOrCreateMonth(Number(referenceYear), Number(referenceMonth));
  const date = `${referenceYear}-${String(referenceMonth).padStart(2, "0")}-01`;
  const [created] = await db
    .insert(incomes)
    .values({
      personId: Number(personId),
      monthId: month.id,
      description,
      amount: Number(amount).toFixed(2),
      date,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
