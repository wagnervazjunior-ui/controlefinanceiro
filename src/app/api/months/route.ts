import { NextResponse } from "next/server";
import { db } from "../../../db/client";
import { months } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(months));
}
