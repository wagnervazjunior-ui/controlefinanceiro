import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../db/client";
import { statementImports, cards, bankAccounts, months, transactions } from "../../../db/schema";

export async function GET() {
  const rows = await db
    .select({
      id: statementImports.id,
      type: statementImports.type,
      fileName: statementImports.fileName,
      importedAt: statementImports.importedAt,
      cardName: cards.name,
      accountName: bankAccounts.name,
      year: months.year,
      month: months.month,
      txCount: sql<number>`count(distinct ${transactions.id})`,
    })
    .from(statementImports)
    .leftJoin(cards, eq(statementImports.cardId, cards.id))
    .leftJoin(bankAccounts, eq(statementImports.bankAccountId, bankAccounts.id))
    .leftJoin(months, eq(statementImports.monthId, months.id))
    .leftJoin(transactions, eq(transactions.statementImportId, statementImports.id))
    .groupBy(
      statementImports.id, statementImports.type, statementImports.fileName,
      statementImports.importedAt, cards.name, bankAccounts.name, months.year, months.month
    )
    .orderBy(statementImports.importedAt);

  return NextResponse.json(rows);
}
