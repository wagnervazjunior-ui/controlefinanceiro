import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { transactions, statementImports, months } from "../db/schema";
import { parseFaturaText } from "./parsers/itau-fatura";
import { parseExtratoText } from "./parsers/itau-extrato";
import { buildDedupeKey } from "./dedupe";
import { buildInstallmentGroupKey } from "./installments";

async function getOrCreateMonth(year: number, month: number) {
  const existing = await db
    .select()
    .from(months)
    .where(and(eq(months.year, year), eq(months.month, month)));
  if (existing[0]) return existing[0];
  const [created] = await db.insert(months).values({ year, month }).returning();
  return created;
}

export async function importFatura(input: {
  text: string;
  referenceYear: number;
  referenceMonth: number;
  cardId: number;
  fileName: string;
}): Promise<{ created: number; skipped: number; skippedItems: { date: string; description: string; amount: number }[] }> {
  const parsed = parseFaturaText(input.text, input.referenceYear, input.referenceMonth);
  let created = 0;
  let skipped = 0;
  const skippedItems: { date: string; description: string; amount: number }[] = [];

  // All transactions in a fatura belong to the fatura's reference month,
  // regardless of the actual transaction date (e.g. a May fatura closing
  // on June 3rd has June transactions that still count as May expenses).
  const month = await getOrCreateMonth(input.referenceYear, input.referenceMonth);

  // Track how many times each base dedupe key appears in this import batch,
  // so identical transactions (same date/description/amount) get unique keys.
  const keyCounters = new Map<string, number>();

  for (const tx of parsed) {

    // Installments of the same original purchase share the same date,
    // description, and amount in Itau fatura statements (only the
    // installment counter changes month to month). Fold the installment
    // counter into the dedupe-key description so each installment gets a
    // distinct key instead of colliding with prior/future installments.
    const dedupeDescription =
      tx.installmentCurrent && tx.installmentTotal
        ? `${tx.description} ${tx.installmentCurrent}/${tx.installmentTotal}`
        : tx.description;

    const baseKey = buildDedupeKey({
      date: tx.date,
      description: dedupeDescription,
      amount: tx.amount,
      source: `card:${input.cardId}`,
    });

    const occurrence = (keyCounters.get(baseKey) ?? 0) + 1;
    keyCounters.set(baseKey, occurrence);
    const dedupeKey = occurrence === 1 ? baseKey : `${baseKey}#${occurrence}`;

    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.dedupeKey, dedupeKey));
    if (existing[0]) {
      skipped++;
      skippedItems.push({ date: tx.date, description: tx.description, amount: tx.amount });
      continue;
    }

    const [statementImport] = await db
      .insert(statementImports)
      .values({
        type: "fatura",
        monthId: month.id,
        cardId: input.cardId,
        fileName: input.fileName,
      })
      .returning();

    const installmentGroupKey =
      tx.installmentTotal != null
        ? buildInstallmentGroupKey({
            description: tx.description,
            installmentTotal: tx.installmentTotal,
          })
        : null;

    let categoryId: number | null = null;
    if (installmentGroupKey) {
      const previous = await db
        .select()
        .from(transactions)
        .where(eq(transactions.installmentGroupKey, installmentGroupKey));
      const previousWithCategory = previous.find((p) => p.categoryId !== null);
      categoryId = previousWithCategory?.categoryId ?? null;
    }

    await db.insert(transactions).values({
      statementImportId: statementImport.id,
      monthId: month.id,
      cardId: input.cardId,
      description: tx.description,
      amount: tx.amount.toFixed(2),
      date: tx.date,
      categoryId,
      installmentCurrent: tx.installmentCurrent ?? null,
      installmentTotal: tx.installmentTotal ?? null,
      installmentGroupKey,
      bankSuggestedTag: tx.bankSuggestedTag ?? null,
      dedupeKey,
    });
    created++;
  }

  return { created, skipped, skippedItems };
}

export async function importExtrato(input: {
  text: string;
  referenceYear: number;
  referenceMonth: number;
  bankAccountId: number;
  fileName: string;
}): Promise<{ created: number; skipped: number }> {
  const parsed = parseExtratoText(input.text, input.referenceYear, input.referenceMonth);
  const month = await getOrCreateMonth(input.referenceYear, input.referenceMonth);
  let created = 0;
  let skipped = 0;

  // Track duplicate base keys within this batch so identical statement lines
  // (same date/description/amount) each get a unique key instead of colliding.
  const keyCounters = new Map<string, number>();

  for (const tx of parsed) {
    const baseKey = buildDedupeKey({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      source: `account:${input.bankAccountId}`,
    });

    const occurrence = (keyCounters.get(baseKey) ?? 0) + 1;
    keyCounters.set(baseKey, occurrence);
    const dedupeKey = occurrence === 1 ? baseKey : `${baseKey}#${occurrence}`;

    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.dedupeKey, dedupeKey));
    if (existing[0]) {
      skipped++;
      continue;
    }

    const [statementImport] = await db
      .insert(statementImports)
      .values({
        type: "extrato",
        monthId: month.id,
        bankAccountId: input.bankAccountId,
        fileName: input.fileName,
      })
      .returning();

    await db.insert(transactions).values({
      statementImportId: statementImport.id,
      monthId: month.id,
      bankAccountId: input.bankAccountId,
      description: tx.description,
      amount: tx.amount.toFixed(2),
      date: tx.date,
      dedupeKey,
    });
    created++;
  }

  return { created, skipped };
}
