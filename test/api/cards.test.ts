import { describe, it, expect, afterAll } from "vitest";
import { db } from "../../src/db/client";
import { cards, bankAccounts } from "../../src/db/schema";
import { GET as getCards, POST as postCards } from "../../src/app/api/cards/route";
import { GET as getBankAccounts, POST as postBankAccounts } from "../../src/app/api/bank-accounts/route";
import { inArray } from "drizzle-orm";

const createdCardIds: number[] = [];
const createdAccountIds: number[] = [];

async function cleanupCreatedData() {
  if (createdCardIds.length > 0) {
    await db.delete(cards).where(inArray(cards.id, createdCardIds));
  }
  if (createdAccountIds.length > 0) {
    await db.delete(bankAccounts).where(inArray(bankAccounts.id, createdAccountIds));
  }
  createdCardIds.length = 0;
  createdAccountIds.length = 0;
}

describe("Cards API Routes", () => {
  afterAll(async () => {
    await cleanupCreatedData();
  });

  it("GET /api/cards returns an array", async () => {
    const response = await getCards();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST /api/cards creates a card and returns 201", async () => {
    const request = new Request("http://localhost:3000/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Itau Black",
        lastFourDigits: "3269",
        bank: "Itau",
      }),
    });

    const response = await postCards(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.name).toBe("Itau Black");
    expect(data.lastFourDigits).toBe("3269");
    expect(data.bank).toBe("Itau");

    createdCardIds.push(data.id);
  });

  it("POST and GET /api/cards work together", async () => {
    const createRequest = new Request("http://localhost:3000/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Nubank",
        lastFourDigits: "5678",
        bank: "Nubank",
      }),
    });
    const createResponse = await postCards(createRequest as any);
    const createdCard = await createResponse.json();
    createdCardIds.push(createdCard.id);

    const getResponse = await getCards();
    const cardsData = await getResponse.json();

    expect(Array.isArray(cardsData)).toBe(true);
    expect(cardsData.some((c: any) => c.id === createdCard.id && c.name === "Nubank")).toBe(true);
  });
});

describe("Bank Accounts API Routes", () => {
  afterAll(async () => {
    await cleanupCreatedData();
  });

  it("GET /api/bank-accounts returns an array", async () => {
    const response = await getBankAccounts();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST /api/bank-accounts creates a bank account and returns 201", async () => {
    const request = new Request("http://localhost:3000/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Conta Corrente",
        bank: "Itau",
      }),
    });

    const response = await postBankAccounts(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.name).toBe("Conta Corrente");
    expect(data.bank).toBe("Itau");

    createdAccountIds.push(data.id);
  });

  it("POST and GET /api/bank-accounts work together", async () => {
    const createRequest = new Request("http://localhost:3000/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Poupança",
        bank: "Nubank",
      }),
    });
    const createResponse = await postBankAccounts(createRequest as any);
    const createdAccount = await createResponse.json();
    createdAccountIds.push(createdAccount.id);

    const getResponse = await getBankAccounts();
    const accountsData = await getResponse.json();

    expect(Array.isArray(accountsData)).toBe(true);
    expect(accountsData.some((a: any) => a.id === createdAccount.id && a.name === "Poupança")).toBe(true);
  });
});
