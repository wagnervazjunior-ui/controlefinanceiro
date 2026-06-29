import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { investments } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(investments));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db
    .insert(investments)
    .values({
      assetType: body.assetType,
      description: body.description ?? null,
      contributionAmount: body.contributionAmount?.toFixed(2) ?? null,
      currentBalance: body.currentBalance.toFixed(2),
      date: body.date,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
