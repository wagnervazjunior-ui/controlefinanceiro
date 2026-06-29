import { describe, it, expect } from "vitest";
import { validateSplitsSumTo100, computePersonTotals } from "../../src/lib/category-split";

describe("validateSplitsSumTo100", () => {
  it("accepts splits summing to exactly 100", () => {
    expect(validateSplitsSumTo100([{ percentage: 50 }, { percentage: 30 }, { percentage: 20 }])).toBe(true);
  });

  it("rejects splits summing to less than 100", () => {
    expect(validateSplitsSumTo100([{ percentage: 50 }, { percentage: 30 }])).toBe(false);
  });

  it("accepts splits with rounding tolerance up to 0.01", () => {
    expect(validateSplitsSumTo100([{ percentage: 33.33 }, { percentage: 33.33 }, { percentage: 33.34 }])).toBe(true);
  });
});

describe("computePersonTotals", () => {
  it("distributes category totals across people by percentage", () => {
    const result = computePersonTotals(
      [{ categoryId: 1, amount: 100 }, { categoryId: 1, amount: 50 }],
      [{ categoryId: 1, personId: 10, percentage: 60 }, { categoryId: 1, personId: 20, percentage: 40 }]
    );
    expect(result).toEqual(
      expect.arrayContaining([
        { personId: 10, total: 90 },
        { personId: 20, total: 60 },
      ])
    );
  });

  it("ignores transactions with no category", () => {
    const result = computePersonTotals(
      [{ categoryId: null as unknown as number, amount: 100 }],
      [{ categoryId: 1, personId: 10, percentage: 100 }]
    );
    expect(result).toEqual([]);
  });
});
