import { describe, it, expect, afterAll } from "vitest";
import { db } from "../../src/db/client";
import { investments } from "../../src/db/schema";
import { GET as getInvestments, POST as postInvestments } from "../../src/app/api/investments/route";
import { inArray } from "drizzle-orm";

const createdInvestmentIds: number[] = [];

async function cleanupCreatedData() {
  if (createdInvestmentIds.length > 0) {
    await db.delete(investments).where(inArray(investments.id, createdInvestmentIds));
  }
  createdInvestmentIds.length = 0;
}

describe("Investments API Routes", () => {
  afterAll(async () => {
    await cleanupCreatedData();
  });

  it("GET /api/investments returns an array", async () => {
    const response = await getInvestments();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST /api/investments creates an investment and returns 201", async () => {
    const request = new Request("http://localhost:3000/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetType: "Tesouro Selic",
        description: "Reserva de emergência",
        contributionAmount: 500,
        currentBalance: 15234.56,
        date: "2026-06-01",
      }),
    });

    const response = await postInvestments(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.assetType).toBe("Tesouro Selic");
    expect(data.description).toBe("Reserva de emergência");
    expect(data.contributionAmount).toBe("500.00");
    expect(data.currentBalance).toBe("15234.56");
    expect(data.date).toBe("2026-06-01");

    createdInvestmentIds.push(data.id);
  });

  it("POST /api/investments without contributionAmount stores null", async () => {
    const request = new Request("http://localhost:3000/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetType: "Ações",
        currentBalance: 1000,
        date: "2026-06-15",
      }),
    });

    const response = await postInvestments(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.contributionAmount).toBeNull();
    expect(data.description).toBeNull();

    createdInvestmentIds.push(data.id);
  });

  it("POST and GET /api/investments work together", async () => {
    const createRequest = new Request("http://localhost:3000/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetType: "CDB",
        currentBalance: 2500.5,
        date: "2026-06-20",
      }),
    });
    const createResponse = await postInvestments(createRequest as any);
    const created = await createResponse.json();
    createdInvestmentIds.push(created.id);

    const getResponse = await getInvestments();
    const allData = await getResponse.json();

    expect(Array.isArray(allData)).toBe(true);
    expect(
      allData.some((inv: any) => inv.id === created.id && inv.assetType === "CDB")
    ).toBe(true);
  });
});
