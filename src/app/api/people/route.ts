import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { people } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(people));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db.insert(people).values({ name: body.name }).returning();
  return NextResponse.json(created, { status: 201 });
}
