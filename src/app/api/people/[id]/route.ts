import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { people, categorySplits } from "../../../../db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const personId = Number(id);
  if (isNaN(personId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const splits = await db.select().from(categorySplits).where(eq(categorySplits.personId, personId));
  if (splits.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir: pessoa possui splits de categoria vinculados." },
      { status: 409 }
    );
  }

  const deleted = await db.delete(people).where(eq(people.id, personId)).returning();
  if (deleted.length === 0) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
