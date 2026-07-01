import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "../../../../db/client";
import { statementImports, transactions } from "../../../../db/schema";

export async function POST(request: NextRequest) {
  const { ids } = await request.json() as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  await db.delete(transactions).where(inArray(transactions.statementImportId, ids));
  await db.delete(statementImports).where(inArray(statementImports.id, ids));
  return new NextResponse(null, { status: 204 });
}
