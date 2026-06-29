import bcrypt from "bcryptjs";
import { db } from "./client";
import { users } from "./schema";

async function seed() {
  const wagnerPassword = process.env.SEED_WAGNER_PASSWORD;
  const esposaPassword = process.env.SEED_ESPOSA_PASSWORD;
  if (!wagnerPassword || !esposaPassword) {
    throw new Error("Set SEED_WAGNER_PASSWORD and SEED_ESPOSA_PASSWORD env vars before seeding");
  }

  await db.insert(users).values([
    { name: "Wagner", email: "wagner@controlefinanceiro.app", passwordHash: await bcrypt.hash(wagnerPassword, 10) },
    { name: "Esposa", email: "esposa@controlefinanceiro.app", passwordHash: await bcrypt.hash(esposaPassword, 10) },
  ]);

  console.log("Seeded 2 users.");
}

seed().then(() => process.exit(0));
