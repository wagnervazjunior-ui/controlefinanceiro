import { NextRequest, NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { people } from "../../../../../db/schema";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.update(people).set({ isMain: false }).where(ne(people.id, id));
  await db.update(people).set({ isMain: true }).where(eq(people.id, id));

  return NextResponse.json({ ok: true });
}
