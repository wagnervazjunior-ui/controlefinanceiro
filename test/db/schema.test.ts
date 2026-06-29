import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../src/db/client";
import { people } from "../../src/db/schema";

describe("schema", () => {
  it("inserts and reads a person", async () => {
    const [inserted] = await db.insert(people).values({ name: "Teste Smoke" }).returning();
    expect(inserted.name).toBe("Teste Smoke");
    await db.delete(people).where(eq(people.id, inserted.id));
  });
});
