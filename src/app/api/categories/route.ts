import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { categories } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(categories));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db
    .insert(categories)
    .values({ name: body.name, bankTagAlias: body.bankTagAlias ?? null })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
