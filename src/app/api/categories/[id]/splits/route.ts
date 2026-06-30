import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { categorySplits } from "../../../../../db/schema";
import { validateSplitsSumTo100 } from "../../../../../lib/category-split";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const splits = await db
    .select()
    .from(categorySplits)
    .where(eq(categorySplits.categoryId, Number(id)));
  return NextResponse.json(splits);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = Number(id);
  const body = (await request.json()) as { personId: number; percentage: number }[];

  if (!validateSplitsSumTo100(body)) {
    return NextResponse.json({ error: "Splits must sum to 100%" }, { status: 400 });
  }

  await db.delete(categorySplits).where(eq(categorySplits.categoryId, categoryId));
  await db.insert(categorySplits).values(
    body.map((s) => ({ categoryId, personId: s.personId, percentage: s.percentage.toFixed(2) }))
  );

  return NextResponse.json({ ok: true });
}
