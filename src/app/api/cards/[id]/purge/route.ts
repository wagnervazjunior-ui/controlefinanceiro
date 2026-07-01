import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { transactions, statementImports } from "../../../../../db/schema";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cardId = Number((await params).id);
  await db.delete(transactions).where(eq(transactions.cardId, cardId));
  await db.delete(statementImports).where(eq(statementImports.cardId, cardId));
  return NextResponse.json({ ok: true });
}
