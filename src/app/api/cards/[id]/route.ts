import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { cards, statementImports } from "../../../../db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardId = Number(id);

  const imports = await db.select().from(statementImports).where(eq(statementImports.cardId, cardId));
  if (imports.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir: cartão possui importações vinculadas." },
      { status: 409 }
    );
  }

  const deleted = await db.delete(cards).where(eq(cards.id, cardId)).returning();
  if (deleted.length === 0) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
