import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/db/client";
import { categories, months, statementImports, transactions } from "../../src/db/schema";
import { GET as getTransactions } from "../../src/app/api/transactions/route";
import { PATCH as patchTransaction } from "../../src/app/api/transactions/[id]/route";
import { inArray, eq } from "drizzle-orm";

const createdCategoryIds: number[] = [];
const createdTransactionIds: number[] = [];
const createdStatementImportIds: number[] = [];
const createdMonthIds: number[] = [];

async function cleanupCreatedData() {
  if (createdTransactionIds.length > 0) {
    await db.delete(transactions).where(inArray(transactions.id, createdTransactionIds));
  }
  if (createdStatementImportIds.length > 0) {
    await db.delete(statementImports).where(inArray(statementImports.id, createdStatementImportIds));
  }
  if (createdMonthIds.length > 0) {
    await db.delete(months).where(inArray(months.id, createdMonthIds));
  }
  if (createdCategoryIds.length > 0) {
    await db.delete(categories).where(inArray(categories.id, createdCategoryIds));
  }
  createdTransactionIds.length = 0;
  createdStatementImportIds.length = 0;
  createdMonthIds.length = 0;
  createdCategoryIds.length = 0;
}

function makeRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Transactions API Routes", () => {
  let monthId: number;
  let statementImportId: number;
  let categoryId: number;

  beforeAll(async () => {
    const [category] = await db
      .insert(categories)
      .values({ name: "Saude Teste Task12", bankTagAlias: "saude-teste-task12" })
      .returning();
    categoryId = category.id;
    createdCategoryIds.push(categoryId);

    const [month] = await db
      .insert(months)
      .values({ year: 2099, month: 1, status: "aberto" })
      .returning();
    monthId = month.id;
    createdMonthIds.push(monthId);

    const [statementImport] = await db
      .insert(statementImports)
      .values({ type: "fatura", monthId, fileName: "test-task12.pdf" })
      .returning();
    statementImportId = statementImport.id;
    createdStatementImportIds.push(statementImportId);
  });

  afterAll(async () => {
    await cleanupCreatedData();
  });

  it("GET /api/transactions?uncategorized=true returns uncategorized transactions with suggestions", async () => {
    const [tx] = await db
      .insert(transactions)
      .values({
        statementImportId,
        monthId,
        description: "Farmacia Task12",
        amount: "50.00",
        date: "2099-01-05",
        bankSuggestedTag: "saude-teste-task12",
        dedupeKey: `task12-uncategorized-${Date.now()}`,
      })
      .returning();
    createdTransactionIds.push(tx.id);

    const request = new Request(
      "http://localhost:3000/api/transactions?uncategorized=true"
    ) as any;
    request.nextUrl = new URL(request.url);

    const response = await getTransactions(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    const found = data.find((t: any) => t.id === tx.id);
    expect(found).toBeDefined();
    expect(found.categoryId).toBeNull();
    expect(found.suggestedCategoryId).toBe(categoryId);
  });

  it("GET /api/transactions returns all transactions", async () => {
    const [tx] = await db
      .insert(transactions)
      .values({
        statementImportId,
        monthId,
        description: "Restaurante Task12",
        amount: "30.00",
        date: "2099-01-06",
        categoryId,
        dedupeKey: `task12-all-${Date.now()}`,
      })
      .returning();
    createdTransactionIds.push(tx.id);

    const request = new Request("http://localhost:3000/api/transactions") as any;
    request.nextUrl = new URL(request.url);

    const response = await getTransactions(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.some((t: any) => t.id === tx.id)).toBe(true);
  });

  it("PATCH /api/transactions/[id] updates the categoryId", async () => {
    const [tx] = await db
      .insert(transactions)
      .values({
        statementImportId,
        monthId,
        description: "Mercado Task12",
        amount: "75.00",
        date: "2099-01-07",
        dedupeKey: `task12-patch-${Date.now()}`,
      })
      .returning();
    createdTransactionIds.push(tx.id);

    const request = makeRequest(
      `http://localhost:3000/api/transactions/${tx.id}`,
      { categoryId }
    );

    const response = await patchTransaction(request as any, {
      params: Promise.resolve({ id: String(tx.id) }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(tx.id);
    expect(data.categoryId).toBe(categoryId);

    const [reloaded] = await db.select().from(transactions).where(eq(transactions.id, tx.id));
    expect(reloaded.categoryId).toBe(categoryId);
  });
});
