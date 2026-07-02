import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "../../../db/client";
import { settlements, people } from "../../../db/schema";
import { computeOwedByPerson } from "../../../lib/owed-by-person";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");
  const monthIdNum = monthId ? Number(monthId) : null;

  const allPeople = await db.select().from(people);
  const mainPerson = allPeople.find((p) => p.isMain);
  const owed = await computeOwedByPerson(monthIdNum, mainPerson?.id);

  const existing = monthIdNum
    ? await db.select().from(settlements).where(eq(settlements.monthId, monthIdNum))
    : [];
  const settlementByPerson = new Map(existing.map((s) => [s.personId, s]));

  // Non-main people only — they owe their share to the main person.
  const result = allPeople
    .filter((p) => !p.isMain)
    .map((p) => {
      const owedAmount = Number((owed.get(p.id) ?? 0).toFixed(2));
      const s = settlementByPerson.get(p.id);
      const paidAmount = s ? Number(s.paidAmount) : 0;
      const confirmed = s?.confirmed ?? false;
      const difference = Number(Math.max(owedAmount - paidAmount, 0).toFixed(2));
      return { personId: p.id, personName: p.name, owed: owedAmount, paid: paidAmount, confirmed, difference };
    });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { personId, monthId, paidAmount, confirmed } = body;
  if (!personId || !monthId) {
    return NextResponse.json({ error: "personId e monthId são obrigatórios." }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(settlements)
    .where(and(eq(settlements.personId, Number(personId)), eq(settlements.monthId, Number(monthId))));

  if (existing[0]) {
    const [updated] = await db
      .update(settlements)
      .set({ paidAmount: Number(paidAmount ?? 0).toFixed(2), confirmed: !!confirmed, updatedAt: new Date() })
      .where(eq(settlements.id, existing[0].id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(settlements)
    .values({
      personId: Number(personId),
      monthId: Number(monthId),
      paidAmount: Number(paidAmount ?? 0).toFixed(2),
      confirmed: !!confirmed,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
