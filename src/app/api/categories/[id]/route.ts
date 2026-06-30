import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { categories, transactions } from "../../../../db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = Number(id);

  const linked = await db.select().from(transactions).where(eq(transactions.categoryId, categoryId));
  if (linked.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir: categoria possui lançamentos vinculados." },
      { status: 409 }
    );
  }

  const deleted = await db.delete(categories).where(eq(categories.id, categoryId)).returning();
  if (deleted.length === 0) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
