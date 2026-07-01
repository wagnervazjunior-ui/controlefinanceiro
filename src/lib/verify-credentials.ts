import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ id: number; name: string } | null> {
  // Normalize the email so mobile keyboards that auto-capitalize or add a
  // trailing space still match the stored (lowercase) address.
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, name: user.name };
}
