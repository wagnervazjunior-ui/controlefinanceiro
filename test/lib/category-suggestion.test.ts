import { describe, it, expect } from "vitest";
import { suggestCategoryId } from "../../src/lib/category-suggestion";

describe("suggestCategoryId", () => {
  const categories = [
    { id: 1, bankTagAlias: "saude" },
    { id: 2, bankTagAlias: "restaurante" },
  ];

  it("matches a category by its bank tag alias, case-insensitively", () => {
    expect(suggestCategoryId("saúde", categories)).toBe(1);
  });

  it("returns null when no category matches the tag", () => {
    expect(suggestCategoryId("viagem", categories)).toBeNull();
  });

  it("returns null when tag is null", () => {
    expect(suggestCategoryId(null, categories)).toBeNull();
  });
});
