import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { incomes } from "../../../../db/schema";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(incomes).where(eq(incomes.id, Number(id)));
  return new NextResponse(null, { status: 204 });
}
