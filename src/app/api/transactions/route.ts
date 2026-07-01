import { NextRequest, NextResponse } from "next/server";
import { isNull, desc } from "drizzle-orm";
import { db } from "../../../db/client";
import { transactions, categories } from "../../../db/schema";
import { suggestCategoryId } from "../../../lib/category-suggestion";

export async function GET(request: NextRequest) {
  const uncategorizedOnly = request.nextUrl.searchParams.get("uncategorized") === "true";
  const allCategories = await db.select().from(categories);

  const rows = uncategorizedOnly
    ? await db.select().from(transactions).where(isNull(transactions.categoryId)).orderBy(desc(transactions.date))
    : await db.select().from(transactions).orderBy(desc(transactions.date));

  const withSuggestions = rows.map((tx) => ({
    ...tx,
    suggestedCategoryId: suggestCategoryId(tx.bankSuggestedTag, allCategories),
  }));

  return NextResponse.json(withSuggestions);
}
