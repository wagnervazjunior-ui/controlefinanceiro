import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { statementImports } from "../../../../db/schema";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // transactions cascade-delete via FK onDelete: "cascade"
  await db.delete(statementImports).where(eq(statementImports.id, Number(id)));
  return new NextResponse(null, { status: 204 });
}
