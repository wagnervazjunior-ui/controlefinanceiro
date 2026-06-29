import { describe, it, expect, beforeEach, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "../../src/db/client";
import { users } from "../../src/db/schema";
import { verifyCredentials } from "../../src/lib/verify-credentials";

describe("verifyCredentials", () => {
  beforeEach(async () => {
    await db.delete(users);
    await db.insert(users).values({
      name: "Wagner",
      email: "wagner@example.com",
      passwordHash: await bcrypt.hash("senha123", 10),
    });
  });

  afterAll(async () => {
    await db.delete(users);
  });

  it("returns the user when credentials match", async () => {
    const result = await verifyCredentials("wagner@example.com", "senha123");
    expect(result?.name).toBe("Wagner");
  });

  it("returns null when password is wrong", async () => {
    const result = await verifyCredentials("wagner@example.com", "wrong");
    expect(result).toBeNull();
  });

  it("returns null when email does not exist", async () => {
    const result = await verifyCredentials("nobody@example.com", "senha123");
    expect(result).toBeNull();
  });
});
