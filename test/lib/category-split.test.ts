import { describe, it, expect } from "vitest";
import { validateSplitsSumTo100 } from "../../src/lib/category-split";

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
