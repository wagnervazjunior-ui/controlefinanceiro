import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseFaturaText } from "../../../src/lib/parsers/itau-fatura";

const fixture = readFileSync(
  join(__dirname, "../../fixtures/fatura-itau-sample.txt"),
  "utf-8"
);

describe("parseFaturaText", () => {
  const result = parseFaturaText(fixture, 2026, 5);

  it("parses a transaction with installment and bank tag", () => {
    const tx = result.find((t) => t.description.includes("NCL *60319496"));
    expect(tx).toMatchObject({
      date: "2026-11-09",
      installmentCurrent: 7,
      installmentTotal: 12,
      amount: 1316.56,
      bankSuggestedTag: "viagem",
    });
  });

  it("parses a transaction without installment", () => {
    const tx = result.find((t) => t.description.includes("APPLE.COM"));
    expect(tx).toMatchObject({
      date: "2026-05-03",
      amount: 30.9,
      bankSuggestedTag: "outros",
    });
    expect(tx?.installmentCurrent).toBeUndefined();
  });

  it("parses a negative (refund) transaction", () => {
    const tx = result.find((t) => t.description.includes("MERCADOSELLERCONSSo"));
    expect(tx?.amount).toBeCloseTo(-1800.0);
  });

  it("parses lançamentos: produtos e serviços without bank tag", () => {
    const tx = result.find((t) => t.description.includes("Mensalidade"));
    expect(tx).toMatchObject({ date: "2026-05-02", amount: 105.0 });
    expect(tx?.bankSuggestedTag).toBeUndefined();
  });

  it("returns exactly 7 transactions for the fixture", () => {
    // Fixture has 5 lines in "compras e saques" (NCL, CENTAURO, APPLE,
    // MERCADOSELLERCONSSo, ZP *ECOMME) + 2 lines in "produtos e serviços"
    // (Mensalidade, Redução Mensalidade) = 7. Verified via console.log of
    // actual parser output; all 7 entries match fixture rows correctly.
    expect(result).toHaveLength(7);
  });
});
