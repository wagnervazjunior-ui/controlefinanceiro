import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { cards } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(cards));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db
    .insert(cards)
    .values({ name: body.name, lastFourDigits: body.lastFourDigits || null, bank: body.bank })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
