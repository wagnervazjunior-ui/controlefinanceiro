import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "../../src/db/client";
import { months, cards, transactions, statementImports, categories } from "../../src/db/schema";
import { importFatura } from "../../src/lib/statement-import-service";
import { eq } from "drizzle-orm";

async function cleanTables() {
  await db.delete(transactions);
  await db.delete(statementImports);
  await db.delete(cards);
  await db.delete(months);
  await db.delete(categories);
}

describe("importFatura", () => {
  beforeEach(async () => {
    await cleanTables();
  });

  afterAll(async () => {
    await cleanTables();
  });

  it("creates transactions and carries category forward for matching installments", async () => {
    const [card] = await db.insert(cards).values({ name: "Itau Black", lastFourDigits: "3269", bank: "Itau" }).returning();
    const [category] = await db.insert(categories).values({ name: "Viagem" }).returning();

    const monthMay = `09/11 NCL *60319496 07/12 1.316,56\nviagem SAO PAULO`;
    const faturaMay = `Lançamentos: compras e saques\nWAGNER A V JUNIOR\nDATA ESTABELECIMENTO VALOR EM R$\n${monthMay}`;

    const firstImport = await importFatura({
      text: faturaMay,
      referenceYear: 2026,
      cardId: card.id,
      fileName: "fatura-maio.pdf",
    });
    expect(firstImport.created).toBe(1);

    const [createdTx] = await db.select().from(transactions);
    await db.update(transactions).set({ categoryId: category.id }).where(eq(transactions.id, createdTx.id));

    const faturaJune = `Lançamentos: compras e saques\nWAGNER A V JUNIOR\nDATA ESTABELECIMENTO VALOR EM R$\n09/11 NCL *60319496 08/12 1.316,56\nviagem SAO PAULO`;

    const secondImport = await importFatura({
      text: faturaJune,
      referenceYear: 2026,
      cardId: card.id,
      fileName: "fatura-junho.pdf",
    });
    expect(secondImport.created).toBe(1);

    const all = await db.select().from(transactions);
    const juneTx = all.find((t) => t.installmentCurrent === 8);
    expect(juneTx?.categoryId).toBe(category.id);
  });

  it("skips a transaction already imported with the same dedupe key", async () => {
    const [card] = await db.insert(cards).values({ name: "Itau Black", lastFourDigits: "3269", bank: "Itau" }).returning();
    const fatura = `Lançamentos: compras e saques\nWAGNER A V JUNIOR\nDATA ESTABELECIMENTO VALOR EM R$\n03/05 APPLE.COM/BILL.SAO PAUL 30,90\noutros SAO PAULO`;

    await importFatura({ text: fatura, referenceYear: 2026, cardId: card.id, fileName: "a.pdf" });
    const second = await importFatura({ text: fatura, referenceYear: 2026, cardId: card.id, fileName: "b.pdf" });

    expect(second.created).toBe(0);
    expect(second.skipped).toBe(1);
  });
});
