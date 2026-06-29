import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/db/client";
import {
  categories,
  categorySplits,
  months,
  people,
  statementImports,
  transactions,
} from "../../src/db/schema";
import { GET as getCategoryTotals } from "../../src/app/api/reports/category-totals/route";
import { GET as getPersonTotals } from "../../src/app/api/reports/person-totals/route";
import { inArray } from "drizzle-orm";

const createdCategoryIds: number[] = [];
const createdTransactionIds: number[] = [];
const createdStatementImportIds: number[] = [];
const createdMonthIds: number[] = [];
const createdPersonIds: number[] = [];
const createdSplitIds: number[] = [];

async function cleanupCreatedData() {
  if (createdSplitIds.length > 0) {
    await db.delete(categorySplits).where(inArray(categorySplits.id, createdSplitIds));
  }
  if (createdTransactionIds.length > 0) {
    await db.delete(transactions).where(inArray(transactions.id, createdTransactionIds));
  }
  if (createdStatementImportIds.length > 0) {
    await db.delete(statementImports).where(inArray(statementImports.id, createdStatementImportIds));
  }
  if (createdMonthIds.length > 0) {
    await db.delete(months).where(inArray(months.id, createdMonthIds));
  }
  if (createdPersonIds.length > 0) {
    await db.delete(people).where(inArray(people.id, createdPersonIds));
  }
  if (createdCategoryIds.length > 0) {
    await db.delete(categories).where(inArray(categories.id, createdCategoryIds));
  }
  createdSplitIds.length = 0;
  createdTransactionIds.length = 0;
  createdStatementImportIds.length = 0;
  createdMonthIds.length = 0;
  createdPersonIds.length = 0;
  createdCategoryIds.length = 0;
}

function makeGetRequest(url: string) {
  const request = new Request(url) as any;
  request.nextUrl = new URL(request.url);
  return request;
}

describe("Reports API Routes", () => {
  let monthId: number;
  let statementImportId: number;
  let categoryId: number;
  let personAId: number;
  let personBId: number;

  beforeAll(async () => {
    const [category] = await db
      .insert(categories)
      .values({ name: "Mercado Teste Task14", bankTagAlias: "mercado-teste-task14" })
      .returning();
    categoryId = category.id;
    createdCategoryIds.push(categoryId);

    const [personA] = await db.insert(people).values({ name: "Pessoa A Task14" }).returning();
    personAId = personA.id;
    createdPersonIds.push(personAId);

    const [personB] = await db.insert(people).values({ name: "Pessoa B Task14" }).returning();
    personBId = personB.id;
    createdPersonIds.push(personBId);

    const [splitA] = await db
      .insert(categorySplits)
      .values({ categoryId, personId: personAId, percentage: "60.00" })
      .returning();
    createdSplitIds.push(splitA.id);

    const [splitB] = await db
      .insert(categorySplits)
      .values({ categoryId, personId: personBId, percentage: "40.00" })
      .returning();
    createdSplitIds.push(splitB.id);

    const [month] = await db
      .insert(months)
      .values({ year: 2098, month: 3, status: "aberto" })
      .returning();
    monthId = month.id;
    createdMonthIds.push(monthId);

    const [statementImport] = await db
      .insert(statementImports)
      .values({ type: "fatura", monthId, fileName: "test-task14.pdf" })
      .returning();
    statementImportId = statementImport.id;
    createdStatementImportIds.push(statementImportId);
  });

  afterAll(async () => {
    await cleanupCreatedData();
  });

  it("GET /api/reports/category-totals returns totals grouped by category", async () => {
    const [tx] = await db
      .insert(transactions)
      .values({
        statementImportId,
        monthId,
        description: "Compra Mercado Task14",
        amount: "120.00",
        date: "2098-03-05",
        categoryId,
        dedupeKey: `task14-category-${Date.now()}`,
      })
      .returning();
    createdTransactionIds.push(tx.id);

    const response = await getCategoryTotals(
      makeGetRequest(`http://localhost:3000/api/reports/category-totals?monthId=${monthId}`)
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    const found = data.find((row: any) => row.categoryId === categoryId);
    expect(found).toBeDefined();
    expect(Number(found.total)).toBe(120);
    expect(found.categoryName).toBe("Mercado Teste Task14");
  });

  it("GET /api/reports/person-totals distributes totals by split percentage", async () => {
    const [tx] = await db
      .insert(transactions)
      .values({
        statementImportId,
        monthId,
        description: "Compra Mercado Task14 Pessoa",
        amount: "100.00",
        date: "2098-03-06",
        categoryId,
        dedupeKey: `task14-person-${Date.now()}`,
      })
      .returning();
    createdTransactionIds.push(tx.id);

    const response = await getPersonTotals(
      makeGetRequest(`http://localhost:3000/api/reports/person-totals?monthId=${monthId}`)
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);

    const totalForA = data.find((row: any) => row.personId === personAId);
    const totalForB = data.find((row: any) => row.personId === personBId);
    expect(totalForA).toBeDefined();
    expect(totalForB).toBeDefined();
    // Both this test's tx (100) and the previous test's tx (120) share monthId/categoryId,
    // so the route's totals reflect the combined 220 split 60/40.
    expect(totalForA.total).toBeCloseTo(132, 5);
    expect(totalForB.total).toBeCloseTo(88, 5);
  });
});
