import { describe, it, expect } from "vitest";
import { parseBrazilianAmount, formatBRL } from "../../src/lib/money";

describe("parseBrazilianAmount", () => {
  it("parses values with thousands separator", () => {
    expect(parseBrazilianAmount("1.316,56")).toBeCloseTo(1316.56);
  });
  it("parses negative values", () => {
    expect(parseBrazilianAmount("-1.800,00")).toBeCloseTo(-1800.0);
  });
  it("parses values without thousands separator", () => {
    expect(parseBrazilianAmount("75,06")).toBeCloseTo(75.06);
  });
});

describe("formatBRL", () => {
  it("formats a number as BRL", () => {
    expect(formatBRL(1316.56)).toBe("R$ 1.316,56");
  });
});
