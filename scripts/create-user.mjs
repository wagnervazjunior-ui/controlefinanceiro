// Creates or updates a login user. Run with the credentials passed as env vars
// so the password never lands in shell history / source control, e.g.:
//
//   LOGIN_EMAIL="voce@exemplo.com" LOGIN_PASSWORD="suaSenha" LOGIN_NAME="Wagner" \
//     node --env-file=.env.local scripts/create-user.mjs
//
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const email = (process.env.LOGIN_EMAIL || "").trim().toLowerCase();
const password = process.env.LOGIN_PASSWORD || "";
const name = process.env.LOGIN_NAME || "Usuário";

if (!email || !password) {
  console.error("Defina LOGIN_EMAIL e LOGIN_PASSWORD.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const passwordHash = await bcrypt.hash(password, 10);

const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
if (existing.length > 0) {
  await sql`UPDATE users SET password_hash = ${passwordHash}, name = ${name} WHERE email = ${email}`;
  console.log(`Usuário atualizado: ${email}`);
} else {
  await sql`INSERT INTO users (email, name, password_hash) VALUES (${email}, ${name}, ${passwordHash})`;
  console.log(`Usuário criado: ${email}`);
}
process.exit(0);
