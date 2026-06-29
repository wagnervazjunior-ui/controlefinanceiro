import { describe, it, expect, afterAll } from "vitest";
import { db } from "../../src/db/client";
import { months } from "../../src/db/schema";
import { GET as getMonths, PATCH as patchMonthClose } from "../../src/app/api/months/[id]/close/route";
import { GET as getMonthsList } from "../../src/app/api/months/route";
import { inArray } from "drizzle-orm";

const createdMonthIds: number[] = [];

async function cleanupCreatedData() {
  if (createdMonthIds.length > 0) {
    await db.delete(months).where(inArray(months.id, createdMonthIds));
  }
  createdMonthIds.length = 0;
}

describe("Months API Routes", () => {
  afterAll(async () => {
    await cleanupCreatedData();
  });

  it("GET /api/months returns an array", async () => {
    const response = await getMonthsList();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("PATCH /api/months/:id/close updates month status to 'fechado'", async () => {
    // Insert a test month
    const [testMonth] = await db
      .insert(months)
      .values({
        year: 2024,
        month: 6,
        status: "aberto",
      })
      .returning();

    createdMonthIds.push(testMonth.id);

    // Call PATCH route with async params
    const response = await patchMonthClose(
      new Request("http://localhost:3000/api/months/1/close", {
        method: "PATCH",
      }),
      { params: Promise.resolve({ id: String(testMonth.id) }) }
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("fechado");
    expect(data.id).toBe(testMonth.id);
    expect(data.year).toBe(2024);
    expect(data.month).toBe(6);
  });

  it("PATCH and GET /api/months work together", async () => {
    // Insert a test month
    const [testMonth] = await db
      .insert(months)
      .values({
        year: 2025,
        month: 7,
        status: "aberto",
      })
      .returning();

    createdMonthIds.push(testMonth.id);

    // Close the month via PATCH
    const patchResponse = await patchMonthClose(
      new Request("http://localhost:3000/api/months/1/close", {
        method: "PATCH",
      }),
      { params: Promise.resolve({ id: String(testMonth.id) }) }
    );
    expect(patchResponse.status).toBe(200);

    // Verify via GET
    const getResponse = await getMonthsList();
    const monthsData = await getResponse.json();

    expect(Array.isArray(monthsData)).toBe(true);
    const closedMonth = monthsData.find((m: any) => m.id === testMonth.id);
    expect(closedMonth).toBeDefined();
    expect(closedMonth.status).toBe("fechado");
  });
});
