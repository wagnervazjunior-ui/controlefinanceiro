import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { users } from "./schema";

async function resetPasswords() {
  const wagnerPassword = process.env.NEW_WAGNER_PASSWORD;
  const esposaPassword = process.env.NEW_ESPOSA_PASSWORD;
  if (!wagnerPassword || !esposaPassword) {
    throw new Error("Set NEW_WAGNER_PASSWORD and NEW_ESPOSA_PASSWORD env vars before running");
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(wagnerPassword, 10) })
    .where(eq(users.email, "wagner@controlefinanceiro.app"));

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(esposaPassword, 10) })
    .where(eq(users.email, "esposa@controlefinanceiro.app"));

  console.log("Passwords updated for both users.");
}

resetPasswords().then(() => process.exit(0));
