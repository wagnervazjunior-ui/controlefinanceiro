import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { statementImports, transactions } from "../../../../db/schema";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(transactions).where(eq(transactions.statementImportId, Number(id)));
  await db.delete(statementImports).where(eq(statementImports.id, Number(id)));
  return new NextResponse(null, { status: 204 });
}
