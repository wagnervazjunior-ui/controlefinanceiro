import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { months } from "../../../../../db/schema";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [updated] = await db
    .update(months)
    .set({ status: "fechado" })
    .where(eq(months.id, Number(id)))
    .returning();
  return NextResponse.json(updated);
}
