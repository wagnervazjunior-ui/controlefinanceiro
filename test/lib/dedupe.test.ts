import { describe, it, expect } from "vitest";
import { buildDedupeKey } from "../../src/lib/dedupe";

describe("buildDedupeKey", () => {
  it("builds the same key for identical inputs", () => {
    const a = buildDedupeKey({ date: "2026-06-10", description: "PIX TRANSF X", amount: -50, source: "account:1" });
    const b = buildDedupeKey({ date: "2026-06-10", description: "PIX TRANSF X", amount: -50, source: "account:1" });
    expect(a).toBe(b);
  });

  it("builds different keys when amount differs", () => {
    const a = buildDedupeKey({ date: "2026-06-10", description: "PIX TRANSF X", amount: -50, source: "account:1" });
    const b = buildDedupeKey({ date: "2026-06-10", description: "PIX TRANSF X", amount: -51, source: "account:1" });
    expect(a).not.toBe(b);
  });

  it("builds different keys for different sources", () => {
    const a = buildDedupeKey({ date: "2026-06-10", description: "X", amount: 10, source: "account:1" });
    const b = buildDedupeKey({ date: "2026-06-10", description: "X", amount: 10, source: "account:2" });
    expect(a).not.toBe(b);
  });
});
