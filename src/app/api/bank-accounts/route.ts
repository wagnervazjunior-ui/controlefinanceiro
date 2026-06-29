import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { bankAccounts } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(bankAccounts));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db
    .insert(bankAccounts)
    .values({ name: body.name, bank: body.bank })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
