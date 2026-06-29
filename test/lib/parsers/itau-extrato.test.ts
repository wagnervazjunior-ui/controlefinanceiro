import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseExtratoText } from "../../../src/lib/parsers/itau-extrato";

const fixture = readFileSync(
  join(__dirname, "../../fixtures/extrato-itau-sample.txt"),
  "utf-8"
);

describe("parseExtratoText", () => {
  it("parses transactions within the reference month, skipping SALDO DO DIA", () => {
    const result = parseExtratoText(fixture, 2026, 6);
    expect(result).toHaveLength(4);
    expect(result.map((t) => t.description)).not.toContain(
      expect.stringContaining("SALDO DO DIA")
    );
  });

  it("excludes transactions outside the reference month", () => {
    const result = parseExtratoText(fixture, 2026, 6);
    expect(result.find((t) => t.date === "2026-04-29")).toBeUndefined();
  });

  it("parses negative and positive values correctly", () => {
    const result = parseExtratoText(fixture, 2026, 6);
    const pix = result.find((t) => t.description.includes("PIX TRANSF BEATRIZ"));
    const debit = result.find((t) => t.description.includes("PIX TRANSF WAGNER"));
    expect(pix?.amount).toBeCloseTo(720.0);
    expect(debit?.amount).toBeCloseTo(-37000.0);
  });

  it("includes April transactions when reference month is April", () => {
    const result = parseExtratoText(fixture, 2026, 4);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-04-29");
  });
});
