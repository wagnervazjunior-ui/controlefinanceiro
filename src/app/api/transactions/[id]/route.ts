import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions } from "../../../../db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const [updated] = await db
    .update(transactions)
    .set({ categoryId: body.categoryId })
    .where(eq(transactions.id, Number(id)))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(transactions).where(eq(transactions.id, Number(id)));
  return new NextResponse(null, { status: 204 });
}
