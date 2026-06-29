import { describe, it, expect } from "vitest";
import { buildInstallmentGroupKey } from "../../src/lib/installments";

describe("buildInstallmentGroupKey", () => {
  it("builds the same key regardless of which installment number it is", () => {
    const a = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 12 });
    const b = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 12 });
    expect(a).toBe(b);
  });

  it("normalizes description casing and whitespace", () => {
    const a = buildInstallmentGroupKey({ description: "  ncl *60319496 ", installmentTotal: 12 });
    const b = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 12 });
    expect(a).toBe(b);
  });

  it("builds different keys for different installment totals", () => {
    const a = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 12 });
    const b = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 10 });
    expect(a).not.toBe(b);
  });
});
