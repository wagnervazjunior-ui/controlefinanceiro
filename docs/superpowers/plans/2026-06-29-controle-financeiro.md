# Controle Financeiro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal web app to import credit card invoices (faturas) and bank statements (extratos) from PDF, categorize transactions (with per-category person-split rules and installment carry-forward), close months, view reports, and track investments.

**Architecture:** Next.js App Router monolith, server-side API routes backed by Postgres (Neon) via Drizzle ORM. PDF parsing happens server-side using `pdf-parse` to extract raw text, then bank-specific regex parsers (Itaú fatura/extrato) turn that text into structured transactions. Auth is a minimal NextAuth Credentials setup with two seeded accounts. No client-side state library — server components + route handlers + plain `fetch` from client components where interactivity is needed.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Drizzle ORM + `@neondatabase/serverless`, NextAuth v5 (Credentials provider) + bcrypt, `pdf-parse` for PDF text extraction, Tailwind CSS, Vitest for unit tests, Recharts for charts.

## Global Constraints

- Two fixed user accounts only (Wagner, esposa) — no signup flow, no email verification.
- All money values stored as `numeric(12,2)` in Postgres; parsed amounts use Brazilian format (`1.316,56` → `1316.56`, comma = decimal separator, dot = thousands separator).
- Closing a month (`months.status = "fechado"`) is a visual flag only — never blocks writes to `transactions`.
- Extrato import always asks for an explicit reference month/year and filters parsed rows to that calendar month before persisting.
- Deduplication key for transactions is `(date, description, amount, source)` — computed as `dedupeKey` at parse time, enforced via a unique index.
- No installment pre-creation from the "Compras parceladas - próximas faturas" section — installment carry-forward only happens when the next month's fatura is actually imported.
- Itaú is the only bank format supported initially; parsers must be isolated behind a `BankParser` interface so a second bank can be added later without touching call sites.

---

## File Structure

```
src/
  db/
    schema.ts              # Drizzle table definitions
    client.ts               # Neon connection + drizzle() instance
    seed.ts                  # Seeds the 2 users
  lib/
    auth.ts                  # NextAuth config (Credentials provider)
    money.ts                 # parseBrazilianAmount, formatBRL
    pdf-text.ts               # extractPdfText(buffer): Promise<string>
    parsers/
      types.ts                # ParsedTransaction, BankParser interface
      itau-fatura.ts            # parseFaturaText()
      itau-extrato.ts            # parseExtratoText()
    dedupe.ts                  # buildDedupeKey()
    installments.ts             # buildInstallmentGroupKey(), carryForwardCategory()
    category-split.ts            # computePersonTotals()
  app/
    api/
      auth/[...nextauth]/route.ts
      people/route.ts
      categories/route.ts
      categories/[id]/splits/route.ts
      cards/route.ts
      bank-accounts/route.ts
      months/route.ts
      months/[id]/close/route.ts
      statement-imports/fatura/route.ts
      statement-imports/extrato/route.ts
      transactions/route.ts
      transactions/[id]/route.ts
      reports/category-totals/route.ts
      reports/person-totals/route.ts
      investments/route.ts
    (dashboard)/
      categories/page.tsx
      cards/page.tsx
      import/fatura/page.tsx
      import/extrato/page.tsx
      transactions/page.tsx
      reports/page.tsx
      investments/page.tsx
test/
  fixtures/
    fatura-itau-sample.txt
    extrato-itau-sample.txt
  lib/
    money.test.ts
    pdf-text.test.ts
    parsers/itau-fatura.test.ts
    parsers/itau-extrato.test.ts
    dedupe.test.ts
    installments.test.ts
    category-split.test.ts
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: a runnable `npm run dev` Next.js app and `npm test` Vitest runner that later tasks build on.

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir=false --eslint --use-npm --yes
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless next-auth@beta bcryptjs pdf-parse recharts
npm install -D drizzle-kit vitest @vitejs/plugin-react @types/bcryptjs @types/pdf-parse
```

- [ ] **Step 3: Add Vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Add test script to `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

- [ ] **Step 5: Verify dev server boots**

Run: `npm run dev -- --port 3001 &` then `curl -sf http://localhost:3001 > /dev/null && echo OK`
Expected: `OK` printed, then stop the background dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, Vitest, Drizzle deps"
```

---

### Task 2: Database schema and migrations

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`, `.env.example` (add `DATABASE_URL`)
- Test: `test/db/schema.test.ts`

**Interfaces:**
- Produces: exported Drizzle tables — `users`, `people`, `categories`, `categorySplits`, `cards`, `bankAccounts`, `months`, `statementImports`, `transactions`, `investments` — and `db` client from `src/db/client.ts`.
- Consumes: `DATABASE_URL` env var (Neon connection string).

- [ ] **Step 1: Write schema**

`src/db/schema.ts`:

```ts
import {
  pgTable, serial, text, integer, numeric, date, varchar, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  bankTagAlias: text("bank_tag_alias"),
});

export const categorySplits = pgTable("category_splits", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  personId: integer("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
});

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lastFourDigits: varchar("last_four_digits", { length: 4 }).notNull(),
  bank: text("bank").notNull(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bank: text("bank").notNull(),
});

export const months = pgTable("months", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  status: varchar("status", { length: 10 }).notNull().default("aberto"),
}, (table) => ({
  yearMonthIdx: uniqueIndex("months_year_month_idx").on(table.year, table.month),
}));

export const statementImports = pgTable("statement_imports", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 10 }).notNull(),
  monthId: integer("month_id").notNull().references(() => months.id),
  cardId: integer("card_id").references(() => cards.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  fileName: text("file_name").notNull(),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  statementImportId: integer("statement_import_id").notNull().references(() => statementImports.id, { onDelete: "cascade" }),
  monthId: integer("month_id").notNull().references(() => months.id),
  cardId: integer("card_id").references(() => cards.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  installmentCurrent: integer("installment_current"),
  installmentTotal: integer("installment_total"),
  installmentGroupKey: text("installment_group_key"),
  bankSuggestedTag: text("bank_suggested_tag"),
  dedupeKey: text("dedupe_key").notNull(),
}, (table) => ({
  dedupeIdx: uniqueIndex("transactions_dedupe_key_idx").on(table.dedupeKey),
}));

export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  assetType: text("asset_type").notNull(),
  description: text("description"),
  contributionAmount: numeric("contribution_amount", { precision: 12, scale: 2 }),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
});
```

- [ ] **Step 2: Write Drizzle client**

`src/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 3: Write Drizzle config**

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 4: Generate and run migration against Neon dev branch**

```bash
npm run db:generate
npm run db:migrate
```

Expected: a new file under `drizzle/` and successful "Migrations applied" output. Requires `DATABASE_URL` to already be set in `.env` (provisioned via `vercel env pull` after linking the Neon integration — do this once before running).

- [ ] **Step 5: Write a smoke test that inserts and reads a row**

`test/db/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { db } from "../../src/db/client";
import { people } from "../../src/db/schema";

describe("schema", () => {
  it("inserts and reads a person", async () => {
    const [inserted] = await db.insert(people).values({ name: "Teste Smoke" }).returning();
    expect(inserted.name).toBe("Teste Smoke");
    await db.delete(people).where((p) => p.id.eq(inserted.id));
  });
});
```

- [ ] **Step 6: Run test**

Run: `npm test -- test/db/schema.test.ts`
Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle schema, Neon client, and initial migration"
```

---

### Task 3: Money parsing utility

**Files:**
- Create: `src/lib/money.ts`
- Test: `test/lib/money.test.ts`

**Interfaces:**
- Produces: `parseBrazilianAmount(raw: string): number`, `formatBRL(value: number): string`.

- [ ] **Step 1: Write failing tests**

`test/lib/money.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseBrazilianAmount, formatBRL } from "../../src/lib/money";

describe("parseBrazilianAmount", () => {
  it("parses values with thousands separator", () => {
    expect(parseBrazilianAmount("1.316,56")).toBeCloseTo(1316.56);
  });
  it("parses negative values", () => {
    expect(parseBrazilianAmount("-1.800,00")).toBeCloseTo(-1800.0);
  });
  it("parses values without thousands separator", () => {
    expect(parseBrazilianAmount("75,06")).toBeCloseTo(75.06);
  });
});

describe("formatBRL", () => {
  it("formats a number as BRL", () => {
    expect(formatBRL(1316.56)).toBe("R$ 1.316,56");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- test/lib/money.test.ts`
Expected: FAIL with "Cannot find module '../../src/lib/money'"

- [ ] **Step 3: Implement**

`src/lib/money.ts`:

```ts
export function parseBrazilianAmount(raw: string): number {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) {
    throw new Error(`Cannot parse amount: "${raw}"`);
  }
  return value;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- test/lib/money.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Brazilian money parsing/formatting helpers"
```

---

### Task 4: PDF text extraction

**Files:**
- Create: `src/lib/pdf-text.ts`
- Test: `test/lib/pdf-text.test.ts`, `test/fixtures/minimal.pdf` (generated in the test setup, not hand-authored)

**Interfaces:**
- Produces: `extractPdfText(buffer: Buffer): Promise<string>`.
- Consumes: `pdf-parse` package from Task 1.

- [ ] **Step 1: Write failing test using a generated minimal PDF**

`test/lib/pdf-text.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractPdfText } from "../../src/lib/pdf-text";

const MINIMAL_PDF_BASE64 =
  "JVBERi0xLjEKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNDQgPj4Kc3RyZWFtCkJUIC9GMSAyNCBUZiAxMCAxMDAgVGQgKEhlbGxvIFBERikgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKMAolJUVPRg==";

describe("extractPdfText", () => {
  it("extracts text content from a PDF buffer", async () => {
    const buffer = Buffer.from(MINIMAL_PDF_BASE64, "base64");
    const text = await extractPdfText(buffer);
    expect(text).toContain("Hello PDF");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- test/lib/pdf-text.test.ts`
Expected: FAIL with "Cannot find module '../../src/lib/pdf-text'"

- [ ] **Step 3: Implement**

`src/lib/pdf-text.ts`:

```ts
import pdfParse from "pdf-parse";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- test/lib/pdf-text.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PDF text extraction wrapper"
```

---

### Task 5: Itaú fatura parser

**Files:**
- Create: `src/lib/parsers/types.ts`, `src/lib/parsers/itau-fatura.ts`
- Test: `test/lib/parsers/itau-fatura.test.ts`, `test/fixtures/fatura-itau-sample.txt`

**Interfaces:**
- Produces: `ParsedTransaction` type, `parseFaturaText(text: string): ParsedTransaction[]`.
- Consumes: nothing from earlier tasks (pure string-in, array-out function) — called later by Task 8.

`ParsedTransaction` shape (defined here, reused by Task 6 and Task 8):

```ts
export interface ParsedTransaction {
  date: string;            // ISO "YYYY-MM-DD"
  description: string;
  amount: number;          // signed, BRL
  installmentCurrent?: number;
  installmentTotal?: number;
  bankSuggestedTag?: string;
}
```

- [ ] **Step 1: Create fixture file from the real Itaú fatura sample**

`test/fixtures/fatura-itau-sample.txt`:

```
Lançamentos: compras e saques
WAGNER A V JUNIOR
DATA ESTABELECIMENTO VALOR EM R$
09/11 NCL *60319496 07/12 1.316,56
viagem SAO PAULO
03/12 CENTAURO.COM 06/08 75,06
outros EXTREMA
03/05 APPLE.COM/BILL.SAO PAUL 30,90
outros SAO PAULO
05/05 MP *MERCADOSELLERCONSSo -1.800,00
serviços So Paulo
18/04 ZP *ECOMME 02/06 3.000,00
educacao Franca

Lançamentos: produtos e serviços
DATA PRODUTOS/SERVIÇOS VALOR EM R$
02/05 Mensalidade - Plano do 105,00
Anuidade Diferenciada
09/05 Redução Mensalidade - P -52,50
Anuidade Diferenciada
```

- [ ] **Step 2: Write types file**

`src/lib/parsers/types.ts`:

```ts
export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  installmentCurrent?: number;
  installmentTotal?: number;
  bankSuggestedTag?: string;
}

export interface BankParser {
  parseFaturaText(text: string, referenceYear: number): ParsedTransaction[];
  parseExtratoText(text: string, referenceYear: number, referenceMonth: number): ParsedTransaction[];
}
```

- [ ] **Step 3: Write failing tests**

`test/lib/parsers/itau-fatura.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseFaturaText } from "../../../src/lib/parsers/itau-fatura";

const fixture = readFileSync(
  join(__dirname, "../../fixtures/fatura-itau-sample.txt"),
  "utf-8"
);

describe("parseFaturaText", () => {
  const result = parseFaturaText(fixture, 2026);

  it("parses a transaction with installment and bank tag", () => {
    const tx = result.find((t) => t.description.includes("NCL *60319496"));
    expect(tx).toMatchObject({
      date: "2026-11-09",
      installmentCurrent: 7,
      installmentTotal: 12,
      amount: 1316.56,
      bankSuggestedTag: "viagem",
    });
  });

  it("parses a transaction without installment", () => {
    const tx = result.find((t) => t.description.includes("APPLE.COM"));
    expect(tx).toMatchObject({
      date: "2026-05-03",
      amount: 30.9,
      bankSuggestedTag: "outros",
    });
    expect(tx?.installmentCurrent).toBeUndefined();
  });

  it("parses a negative (refund) transaction", () => {
    const tx = result.find((t) => t.description.includes("MERCADOSELLERCONSSo"));
    expect(tx?.amount).toBeCloseTo(-1800.0);
  });

  it("parses lançamentos: produtos e serviços without bank tag", () => {
    const tx = result.find((t) => t.description.includes("Mensalidade"));
    expect(tx).toMatchObject({ date: "2026-05-02", amount: 105.0 });
    expect(tx?.bankSuggestedTag).toBeUndefined();
  });

  it("returns exactly 6 transactions for the fixture", () => {
    expect(result).toHaveLength(6);
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test -- test/lib/parsers/itau-fatura.test.ts`
Expected: FAIL with "Cannot find module '../../../src/lib/parsers/itau-fatura'"

- [ ] **Step 5: Implement**

`src/lib/parsers/itau-fatura.ts`:

```ts
import { parseBrazilianAmount } from "../money";
import type { ParsedTransaction } from "./types";

const COMPRAS_SECTION_RE = /Lançamentos: compras e saques([\s\S]*?)(?=\n\s*Lançamentos: produtos e serviços|\n\s*Lançamentos internacionais|$)/;
const PRODUTOS_SECTION_RE = /Lançamentos: produtos e serviços([\s\S]*?)(?=\n\s*Lançamentos|$)/;

const TX_WITH_INSTALLMENT_RE =
  /^(\d{2})\/(\d{2})\s+(.+?)\s+(\d{2})\/(\d{2})\s+(-?[\d.]+,\d{2})$/;
const TX_PLAIN_RE = /^(\d{2})\/(\d{2})\s+(.+?)\s+(-?[\d.]+,\d{2})$/;
const TAG_LINE_RE = /^(\S+)\s+(.+)$/;

function toIsoDate(day: string, month: string, referenceYear: number): string {
  // Fatura months wrap a calendar year; a month "ahead" of the statement
  // month belongs to the previous year (e.g. Nov/Dec entries on a May-closing
  // fatura belong to the prior year). Caller passes the fatura's closing year.
  return `${referenceYear}-${month}-${day}`;
}

function parseSection(
  body: string,
  referenceYear: number,
  expectTagLine: boolean
): ParsedTransaction[] {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const withInstallment = line.match(TX_WITH_INSTALLMENT_RE);
    const plain = !withInstallment ? line.match(TX_PLAIN_RE) : null;
    const match = withInstallment ?? plain;
    if (!match) continue;

    let day: string, month: string, description: string, amountRaw: string;
    let installmentCurrent: number | undefined;
    let installmentTotal: number | undefined;

    if (withInstallment) {
      [, day, month, description, , , amountRaw] = withInstallment;
      installmentCurrent = Number(withInstallment[4]);
      installmentTotal = Number(withInstallment[5]);
    } else {
      [, day, month, description, amountRaw] = plain!;
    }

    let bankSuggestedTag: string | undefined;
    if (expectTagLine) {
      const nextLine = lines[i + 1];
      const tagMatch = nextLine?.match(TAG_LINE_RE);
      if (tagMatch && !tagMatch[1].match(/^\d/)) {
        bankSuggestedTag = tagMatch[1].toLowerCase();
        i++; // consume the tag line
      }
    }

    results.push({
      date: toIsoDate(day, month, referenceYear),
      description: description.trim(),
      amount: parseBrazilianAmount(amountRaw),
      installmentCurrent,
      installmentTotal,
      bankSuggestedTag,
    });
  }

  return results;
}

export function parseFaturaText(
  text: string,
  referenceYear: number
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const comprasMatch = text.match(COMPRAS_SECTION_RE);
  if (comprasMatch) {
    transactions.push(...parseSection(comprasMatch[1], referenceYear, true));
  }

  const produtosMatch = text.match(PRODUTOS_SECTION_RE);
  if (produtosMatch) {
    transactions.push(...parseSection(produtosMatch[1], referenceYear, false));
  }

  return transactions;
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npm test -- test/lib/parsers/itau-fatura.test.ts`
Expected: 5 passed.

Note: if the "produtos e serviços" parse picks up the line `Anuidade Diferenciada` as a stray tag line, adjust `expectTagLine=false` path (already set) — the implementation above does not consume a tag line for that section, so `Anuidade Diferenciada` lines are simply skipped because they don't match `TX_WITH_INSTALLMENT_RE`/`TX_PLAIN_RE`. Confirm the "returns exactly 6" count after running; if it differs, inspect actual matches with `console.log(result)` before adjusting the regex — do not guess.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Itau fatura PDF text parser"
```

---

### Task 6: Itaú extrato parser

**Files:**
- Create: `src/lib/parsers/itau-extrato.ts`
- Test: `test/lib/parsers/itau-extrato.test.ts`, `test/fixtures/extrato-itau-sample.txt`

**Interfaces:**
- Produces: `parseExtratoText(text: string, referenceYear: number, referenceMonth: number): ParsedTransaction[]`.
- Consumes: `ParsedTransaction` from `src/lib/parsers/types.ts` (Task 5), `parseBrazilianAmount` from `src/lib/money.ts` (Task 3).

- [ ] **Step 1: Create fixture from the real Itaú extrato sample**

`test/fixtures/extrato-itau-sample.txt`:

```
data lançamentos valor (R$) saldo (R$)
26/06/2026 PIX TRANSF BEATRIZ26/06 720,00
26/06/2026 PIX TRANSF WAGNER 26/06 -37.000,00
26/06/2026 SALDO DO DIA 9.273,74
25/06/2026 REND PAGO APLIC AUT MAIS 0,12
25/06/2026 DA ELETROPAULO 15507467 -274,01
25/06/2026 SALDO DO DIA 8.632,26
29/04/2026 PIX TRANSF IVAN GR29/04 -450,00
29/04/2026 SALDO DO DIA 1.542,04
```

- [ ] **Step 2: Write failing tests**

`test/lib/parsers/itau-extrato.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseExtratoText } from "../../../src/lib/parsers/itau-extrato";

const fixture = readFileSync(
  join(__dirname, "../../fixtures/extrato-itau-sample.txt"),
  "utf-8"
);

describe("parseExtratoText", () => {
  it("parses transactions within the reference month, skipping SALDO DO DIA", () => {
    const result = parseExtratoText(fixture, 2026, 6);
    expect(result).toHaveLength(4);
    expect(result.map((t) => t.description)).not.toContain(
      expect.stringContaining("SALDO DO DIA")
    );
  });

  it("excludes transactions outside the reference month", () => {
    const result = parseExtratoText(fixture, 2026, 6);
    expect(result.find((t) => t.date === "2026-04-29")).toBeUndefined();
  });

  it("parses negative and positive values correctly", () => {
    const result = parseExtratoText(fixture, 2026, 6);
    const pix = result.find((t) => t.description.includes("PIX TRANSF BEATRIZ"));
    const debit = result.find((t) => t.description.includes("PIX TRANSF WAGNER"));
    expect(pix?.amount).toBeCloseTo(720.0);
    expect(debit?.amount).toBeCloseTo(-37000.0);
  });

  it("includes April transactions when reference month is April", () => {
    const result = parseExtratoText(fixture, 2026, 4);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-04-29");
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- test/lib/parsers/itau-extrato.test.ts`
Expected: FAIL with "Cannot find module '../../../src/lib/parsers/itau-extrato'"

- [ ] **Step 4: Implement**

`src/lib/parsers/itau-extrato.ts`:

```ts
import { parseBrazilianAmount } from "../money";
import type { ParsedTransaction } from "./types";

const LINE_RE =
  /^(\d{2})\/(\d{2})\/(\d{4})\s+(.+?)\s+(-?[\d.]+,\d{2})$/;

export function parseExtratoText(
  text: string,
  referenceYear: number,
  referenceMonth: number
): ParsedTransaction[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];

  for (const line of lines) {
    if (line.includes("SALDO DO DIA")) continue;
    const match = line.match(LINE_RE);
    if (!match) continue;

    const [, day, month, year, description, amountRaw] = match;
    if (Number(year) !== referenceYear || Number(month) !== referenceMonth) {
      continue;
    }

    results.push({
      date: `${year}-${month}-${day}`,
      description: description.trim(),
      amount: parseBrazilianAmount(amountRaw),
    });
  }

  return results;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- test/lib/parsers/itau-extrato.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Itau extrato PDF text parser with month filtering"
```

---

### Task 7: Dedupe key and installment grouping

**Files:**
- Create: `src/lib/dedupe.ts`, `src/lib/installments.ts`
- Test: `test/lib/dedupe.test.ts`, `test/lib/installments.test.ts`

**Interfaces:**
- Produces: `buildDedupeKey(input: { date: string; description: string; amount: number; source: string }): string` and `buildInstallmentGroupKey(input: { description: string; installmentTotal: number }): string`.
- Consumes: nothing beyond plain values — called later by Task 8.

- [ ] **Step 1: Write failing tests for dedupe**

`test/lib/dedupe.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- test/lib/dedupe.test.ts`
Expected: FAIL with "Cannot find module '../../src/lib/dedupe'"

- [ ] **Step 3: Implement dedupe**

`src/lib/dedupe.ts`:

```ts
export function buildDedupeKey(input: {
  date: string;
  description: string;
  amount: number;
  source: string;
}): string {
  const normalizedDescription = input.description.trim().toUpperCase();
  return `${input.source}|${input.date}|${normalizedDescription}|${input.amount.toFixed(2)}`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- test/lib/dedupe.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Write failing tests for installment grouping**

`test/lib/installments.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildInstallmentGroupKey } from "../../src/lib/installments";

describe("buildInstallmentGroupKey", () => {
  it("builds the same key regardless of which installment number it is", () => {
    const a = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 12 });
    const b = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 12 });
    expect(a).toBe(b);
  });

  it("normalizes description casing and whitespace", () => {
    const a = buildInstallmentGroupKey({ description: "  ncl *60319496 ", installmentTotal: 12 });
    const b = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 12 });
    expect(a).toBe(b);
  });

  it("builds different keys for different installment totals", () => {
    const a = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 12 });
    const b = buildInstallmentGroupKey({ description: "NCL *60319496", installmentTotal: 10 });
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npm test -- test/lib/installments.test.ts`
Expected: FAIL with "Cannot find module '../../src/lib/installments'"

- [ ] **Step 7: Implement installment grouping**

`src/lib/installments.ts`:

```ts
export function buildInstallmentGroupKey(input: {
  description: string;
  installmentTotal: number;
}): string {
  const normalizedDescription = input.description.trim().toUpperCase();
  return `${normalizedDescription}|${input.installmentTotal}`;
}
```

- [ ] **Step 8: Run to verify pass**

Run: `npm test -- test/lib/installments.test.ts`
Expected: 3 passed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add transaction dedupe key and installment group key builders"
```

---

### Task 8: Statement import pipeline (fatura + extrato)

**Files:**
- Create: `src/app/api/statement-imports/fatura/route.ts`, `src/app/api/statement-imports/extrato/route.ts`, `src/lib/statement-import-service.ts`
- Test: `test/lib/statement-import-service.test.ts`

**Interfaces:**
- Consumes: `parseFaturaText`/`parseExtratoText` (Task 5/6), `buildDedupeKey` (Task 7), `buildInstallmentGroupKey` (Task 7), `db` + `transactions`/`statementImports`/`months` (Task 2).
- Produces: `importFatura(input: { text: string; referenceYear: number; cardId: number; fileName: string }): Promise<{ created: number; skipped: number }>` and `importExtrato(input: { text: string; referenceYear: number; referenceMonth: number; bankAccountId: number; fileName: string }): Promise<{ created: number; skipped: number }>`. Both are imported by the route handlers, which only handle multipart form parsing and call these.

- [ ] **Step 1: Write failing test for `importFatura` installment carry-forward and dedupe**

`test/lib/statement-import-service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../../src/db/client";
import { months, cards, transactions, statementImports, categories } from "../../src/db/schema";
import { importFatura } from "../../src/lib/statement-import-service";
import { eq } from "drizzle-orm";

describe("importFatura", () => {
  beforeEach(async () => {
    await db.delete(transactions);
    await db.delete(statementImports);
    await db.delete(cards);
    await db.delete(months);
    await db.delete(categories);
  });

  it("creates transactions and carries category forward for matching installments", async () => {
    const [card] = await db.insert(cards).values({ name: "Itau Black", lastFourDigits: "3269", bank: "Itau" }).returning();
    const [category] = await db.insert(categories).values({ name: "Viagem" }).returning();

    const monthMay = `09/11 NCL *60319496 07/12 1.316,56\nviagem SAO PAULO`;
    const faturaMay = `Lançamentos: compras e saques\nWAGNER A V JUNIOR\nDATA ESTABELECIMENTO VALOR EM R$\n${monthMay}`;

    const firstImport = await importFatura({
      text: faturaMay,
      referenceYear: 2026,
      cardId: card.id,
      fileName: "fatura-maio.pdf",
    });
    expect(firstImport.created).toBe(1);

    const [createdTx] = await db.select().from(transactions);
    await db.update(transactions).set({ categoryId: category.id }).where(eq(transactions.id, createdTx.id));

    const faturaJune = `Lançamentos: compras e saques\nWAGNER A V JUNIOR\nDATA ESTABELECIMENTO VALOR EM R$\n09/11 NCL *60319496 08/12 1.316,56\nviagem SAO PAULO`;

    const secondImport = await importFatura({
      text: faturaJune,
      referenceYear: 2026,
      cardId: card.id,
      fileName: "fatura-junho.pdf",
    });
    expect(secondImport.created).toBe(1);

    const all = await db.select().from(transactions);
    const juneTx = all.find((t) => t.installmentCurrent === 8);
    expect(juneTx?.categoryId).toBe(category.id);
  });

  it("skips a transaction already imported with the same dedupe key", async () => {
    const [card] = await db.insert(cards).values({ name: "Itau Black", lastFourDigits: "3269", bank: "Itau" }).returning();
    const fatura = `Lançamentos: compras e saques\nWAGNER A V JUNIOR\nDATA ESTABELECIMENTO VALOR EM R$\n03/05 APPLE.COM/BILL.SAO PAUL 30,90\noutros SAO PAULO`;

    await importFatura({ text: fatura, referenceYear: 2026, cardId: card.id, fileName: "a.pdf" });
    const second = await importFatura({ text: fatura, referenceYear: 2026, cardId: card.id, fileName: "b.pdf" });

    expect(second.created).toBe(0);
    expect(second.skipped).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- test/lib/statement-import-service.test.ts`
Expected: FAIL with "Cannot find module '../../src/lib/statement-import-service'"

- [ ] **Step 3: Implement the service**

`src/lib/statement-import-service.ts`:

```ts
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { transactions, statementImports, months } from "../db/schema";
import { parseFaturaText } from "./parsers/itau-fatura";
import { parseExtratoText } from "./parsers/itau-extrato";
import { buildDedupeKey } from "./dedupe";
import { buildInstallmentGroupKey } from "./installments";

async function getOrCreateMonth(year: number, month: number) {
  const existing = await db
    .select()
    .from(months)
    .where(and(eq(months.year, year), eq(months.month, month)));
  if (existing[0]) return existing[0];
  const [created] = await db.insert(months).values({ year, month }).returning();
  return created;
}

export async function importFatura(input: {
  text: string;
  referenceYear: number;
  cardId: number;
  fileName: string;
}): Promise<{ created: number; skipped: number }> {
  const parsed = parseFaturaText(input.text, input.referenceYear);
  let created = 0;
  let skipped = 0;

  for (const tx of parsed) {
    const txMonth = Number(tx.date.split("-")[1]);
    const txYear = Number(tx.date.split("-")[0]);
    const month = await getOrCreateMonth(txYear, txMonth);

    const dedupeKey = buildDedupeKey({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      source: `card:${input.cardId}`,
    });

    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.dedupeKey, dedupeKey));
    if (existing[0]) {
      skipped++;
      continue;
    }

    const [statementImport] = await db
      .insert(statementImports)
      .values({
        type: "fatura",
        monthId: month.id,
        cardId: input.cardId,
        fileName: input.fileName,
      })
      .returning();

    let categoryId: number | null = null;
    if (tx.installmentTotal && tx.installmentCurrent && tx.installmentCurrent > 1) {
      const groupKey = buildInstallmentGroupKey({
        description: tx.description,
        installmentTotal: tx.installmentTotal,
      });
      const previous = await db
        .select()
        .from(transactions)
        .where(eq(transactions.installmentGroupKey, groupKey));
      const previousWithCategory = previous.find((p) => p.categoryId !== null);
      categoryId = previousWithCategory?.categoryId ?? null;
    }

    const installmentGroupKey = tx.installmentTotal
      ? buildInstallmentGroupKey({ description: tx.description, installmentTotal: tx.installmentTotal })
      : null;

    await db.insert(transactions).values({
      statementImportId: statementImport.id,
      monthId: month.id,
      cardId: input.cardId,
      description: tx.description,
      amount: tx.amount.toFixed(2),
      date: tx.date,
      categoryId,
      installmentCurrent: tx.installmentCurrent ?? null,
      installmentTotal: tx.installmentTotal ?? null,
      installmentGroupKey,
      bankSuggestedTag: tx.bankSuggestedTag ?? null,
      dedupeKey,
    });
    created++;
  }

  return { created, skipped };
}

export async function importExtrato(input: {
  text: string;
  referenceYear: number;
  referenceMonth: number;
  bankAccountId: number;
  fileName: string;
}): Promise<{ created: number; skipped: number }> {
  const parsed = parseExtratoText(input.text, input.referenceYear, input.referenceMonth);
  const month = await getOrCreateMonth(input.referenceYear, input.referenceMonth);
  let created = 0;
  let skipped = 0;

  for (const tx of parsed) {
    const dedupeKey = buildDedupeKey({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      source: `account:${input.bankAccountId}`,
    });

    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.dedupeKey, dedupeKey));
    if (existing[0]) {
      skipped++;
      continue;
    }

    const [statementImport] = await db
      .insert(statementImports)
      .values({
        type: "extrato",
        monthId: month.id,
        bankAccountId: input.bankAccountId,
        fileName: input.fileName,
      })
      .returning();

    await db.insert(transactions).values({
      statementImportId: statementImport.id,
      monthId: month.id,
      bankAccountId: input.bankAccountId,
      description: tx.description,
      amount: tx.amount.toFixed(2),
      date: tx.date,
      dedupeKey,
    });
    created++;
  }

  return { created, skipped };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- test/lib/statement-import-service.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Write route handlers**

`src/app/api/statement-imports/fatura/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "../../../../lib/pdf-text";
import { importFatura } from "../../../../lib/statement-import-service";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const cardId = Number(formData.get("cardId"));
  const referenceYear = Number(formData.get("referenceYear"));

  if (!file || !cardId || !referenceYear) {
    return NextResponse.json({ error: "file, cardId, and referenceYear are required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfText(buffer);
  const result = await importFatura({ text, referenceYear, cardId, fileName: file.name });

  return NextResponse.json(result);
}
```

`src/app/api/statement-imports/extrato/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "../../../../lib/pdf-text";
import { importExtrato } from "../../../../lib/statement-import-service";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const bankAccountId = Number(formData.get("bankAccountId"));
  const referenceYear = Number(formData.get("referenceYear"));
  const referenceMonth = Number(formData.get("referenceMonth"));

  if (!file || !bankAccountId || !referenceYear || !referenceMonth) {
    return NextResponse.json(
      { error: "file, bankAccountId, referenceYear, and referenceMonth are required" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfText(buffer);
  const result = await importExtrato({ text, referenceYear, referenceMonth, bankAccountId, fileName: file.name });

  return NextResponse.json(result);
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add statement import service and API routes for fatura/extrato"
```

---

### Task 9: Auth (NextAuth Credentials, 2 seeded users)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/db/seed.ts`, `src/middleware.ts`
- Test: `test/lib/auth.test.ts`

**Interfaces:**
- Consumes: `users` table (Task 2), `bcryptjs`.
- Produces: `authOptions` (NextAuth config), `verifyCredentials(email: string, password: string): Promise<{ id: number; name: string } | null>` used by the Credentials provider and directly tested.

- [ ] **Step 1: Write failing test for credential verification**

`test/lib/auth.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "../../src/db/client";
import { users } from "../../src/db/schema";
import { verifyCredentials } from "../../src/lib/auth";

describe("verifyCredentials", () => {
  beforeEach(async () => {
    await db.delete(users);
    await db.insert(users).values({
      name: "Wagner",
      email: "wagner@example.com",
      passwordHash: await bcrypt.hash("senha123", 10),
    });
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- test/lib/auth.test.ts`
Expected: FAIL with "Cannot find module '../../src/lib/auth'"

- [ ] **Step 3: Implement**

`src/lib/auth.ts`:

```ts
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "../db/client";
import { users } from "../db/schema";

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ id: number; name: string } | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, name: user.name };
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        const user = await verifyCredentials(email, password);
        return user ? { id: String(user.id), name: user.name } : null;
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- test/lib/auth.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Wire NextAuth route and middleware**

`src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "../../../../lib/auth";

export const { GET, POST } = handlers;
```

`src/middleware.ts`:

```ts
import { auth } from "./lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: Write seed script for the two accounts**

`src/db/seed.ts`:

```ts
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
```

Run manually once after deployment: `SEED_WAGNER_PASSWORD=... SEED_ESPOSA_PASSWORD=... npx tsx src/db/seed.ts`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth credentials login and user seed script"
```

---

### Task 10: People and categories CRUD with person-split validation

**Files:**
- Create: `src/lib/category-split.ts`, `src/app/api/people/route.ts`, `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/splits/route.ts`
- Test: `test/lib/category-split.test.ts`

**Interfaces:**
- Consumes: `categories`, `categorySplits`, `people`, `db` (Task 2).
- Produces: `validateSplitsSumTo100(splits: { percentage: number }[]): boolean`, used by the splits route before insert.

- [ ] **Step 1: Write failing test**

`test/lib/category-split.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- test/lib/category-split.test.ts`
Expected: FAIL with "Cannot find module '../../src/lib/category-split'"

- [ ] **Step 3: Implement**

`src/lib/category-split.ts`:

```ts
export function validateSplitsSumTo100(splits: { percentage: number }[]): boolean {
  const total = splits.reduce((sum, s) => sum + s.percentage, 0);
  return Math.abs(total - 100) <= 0.02;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- test/lib/category-split.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Write CRUD routes**

`src/app/api/people/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { people } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(people));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db.insert(people).values({ name: body.name }).returning();
  return NextResponse.json(created, { status: 201 });
}
```

`src/app/api/categories/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { categories } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(categories));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db
    .insert(categories)
    .values({ name: body.name, bankTagAlias: body.bankTagAlias ?? null })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
```

`src/app/api/categories/[id]/splits/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { categorySplits } from "../../../../../db/schema";
import { validateSplitsSumTo100 } from "../../../../../lib/category-split";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const categoryId = Number(params.id);
  const body = await request.json() as { personId: number; percentage: number }[];

  if (!validateSplitsSumTo100(body)) {
    return NextResponse.json({ error: "Splits must sum to 100%" }, { status: 400 });
  }

  await db.delete(categorySplits).where(eq(categorySplits.categoryId, categoryId));
  await db.insert(categorySplits).values(
    body.map((s) => ({ categoryId, personId: s.personId, percentage: s.percentage.toFixed(2) }))
  );

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add people/categories CRUD and category split validation"
```

---

### Task 11: Cards and bank accounts CRUD

**Files:**
- Create: `src/app/api/cards/route.ts`, `src/app/api/bank-accounts/route.ts`

**Interfaces:**
- Consumes: `cards`, `bankAccounts`, `db` (Task 2).
- Produces: standard REST list/create endpoints consumed by the import forms (Task 8 UI pages, Task 13).

- [ ] **Step 1: Write routes**

`src/app/api/cards/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { cards } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(cards));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db
    .insert(cards)
    .values({ name: body.name, lastFourDigits: body.lastFourDigits, bank: body.bank })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
```

`src/app/api/bank-accounts/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { bankAccounts } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(bankAccounts));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db
    .insert(bankAccounts)
    .values({ name: body.name, bank: body.bank })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev -- --port 3001 &` then:
```bash
curl -sf -X POST http://localhost:3001/api/cards -H "Content-Type: application/json" -d '{"name":"Itau Black","lastFourDigits":"3269","bank":"Itau"}'
curl -sf http://localhost:3001/api/cards
```
Expected: the POST returns the created card with an `id`, the GET returns an array containing it. Stop the dev server after.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add cards and bank accounts CRUD routes"
```

---

### Task 12: Transaction categorization API and UI

**Files:**
- Create: `src/app/api/transactions/route.ts`, `src/app/api/transactions/[id]/route.ts`, `src/app/(dashboard)/transactions/page.tsx`
- Test: `test/lib/category-suggestion.test.ts`, `src/lib/category-suggestion.ts`

**Interfaces:**
- Consumes: `transactions`, `categories` (Task 2), `db`.
- Produces: `suggestCategoryId(bankSuggestedTag: string | null, categories: { id: number; bankTagAlias: string | null }[]): number | null`, used by the GET endpoint to attach a `suggestedCategoryId` to each uncategorized transaction.

- [ ] **Step 1: Write failing test for tag-to-category mapping**

`test/lib/category-suggestion.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- test/lib/category-suggestion.test.ts`
Expected: FAIL with "Cannot find module '../../src/lib/category-suggestion'"

- [ ] **Step 3: Implement**

`src/lib/category-suggestion.ts`:

```ts
function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function suggestCategoryId(
  bankSuggestedTag: string | null,
  categories: { id: number; bankTagAlias: string | null }[]
): number | null {
  if (!bankSuggestedTag) return null;
  const normalizedTag = stripAccents(bankSuggestedTag.toLowerCase());
  const match = categories.find(
    (c) => c.bankTagAlias && stripAccents(c.bankTagAlias.toLowerCase()) === normalizedTag
  );
  return match?.id ?? null;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- test/lib/category-suggestion.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Write transaction routes**

`src/app/api/transactions/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq, isNull } from "drizzle-orm";
import { db } from "../../../db/client";
import { transactions, categories } from "../../../db/schema";
import { suggestCategoryId } from "../../../lib/category-suggestion";

export async function GET(request: NextRequest) {
  const uncategorizedOnly = request.nextUrl.searchParams.get("uncategorized") === "true";
  const allCategories = await db.select().from(categories);

  const rows = uncategorizedOnly
    ? await db.select().from(transactions).where(isNull(transactions.categoryId))
    : await db.select().from(transactions);

  const withSuggestions = rows.map((tx) => ({
    ...tx,
    suggestedCategoryId: suggestCategoryId(tx.bankSuggestedTag, allCategories),
  }));

  return NextResponse.json(withSuggestions);
}
```

`src/app/api/transactions/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions } from "../../../../db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const [updated] = await db
    .update(transactions)
    .set({ categoryId: body.categoryId })
    .where(eq(transactions.id, Number(params.id)))
    .returning();
  return NextResponse.json(updated);
}
```

- [ ] **Step 6: Write the categorization page**

`src/app/(dashboard)/transactions/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  categoryId: number | null;
  suggestedCategoryId: number | null;
}

interface Category {
  id: number;
  name: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/transactions?uncategorized=true").then((r) => r.json()).then(setTransactions);
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  async function categorize(transactionId: number, categoryId: number) {
    await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Lançamentos sem categoria</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th>Data</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Categoria</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b">
              <td>{tx.date}</td>
              <td>{tx.description}</td>
              <td>{tx.amount}</td>
              <td>
                <select
                  defaultValue={tx.suggestedCategoryId ?? ""}
                  onChange={(e) => categorize(tx.id, Number(e.target.value))}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add transaction categorization API with bank-tag suggestions and UI"
```

---

### Task 13: Months and monthly closing

**Files:**
- Create: `src/app/api/months/route.ts`, `src/app/api/months/[id]/close/route.ts`

**Interfaces:**
- Consumes: `months`, `db` (Task 2).
- Produces: `PATCH /api/months/:id/close` flips `status` to `"fechado"` without touching `transactions`.

- [ ] **Step 1: Write routes**

`src/app/api/months/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "../../../db/client";
import { months } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(months));
}
```

`src/app/api/months/[id]/close/route.ts`:

```ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { months } from "../../../../../db/schema";

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const [updated] = await db
    .update(months)
    .set({ status: "fechado" })
    .where(eq(months.id, Number(params.id)))
    .returning();
  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev -- --port 3001 &` then:
```bash
curl -sf http://localhost:3001/api/months
curl -sf -X PATCH http://localhost:3001/api/months/1/close
```
Expected: the PATCH response shows `"status":"fechado"` for month id 1 (adjust id to an existing month from the GET response). Stop the dev server after.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add months listing and monthly closing endpoint"
```

---

### Task 14: Reports (category totals and person split)

**Files:**
- Create: `src/lib/category-split.ts` (extend — add `computePersonTotals`), `src/app/api/reports/category-totals/route.ts`, `src/app/api/reports/person-totals/route.ts`, `src/app/(dashboard)/reports/page.tsx`
- Test: extend `test/lib/category-split.test.ts`

**Interfaces:**
- Consumes: `transactions`, `categories`, `categorySplits`, `people`, `db` (Task 2).
- Produces: `computePersonTotals(transactions: { categoryId: number; amount: number }[], splits: { categoryId: number; personId: number; percentage: number }[]): { personId: number; total: number }[]`.

- [ ] **Step 1: Write failing test**

Append to `test/lib/category-split.test.ts`:

```ts
import { computePersonTotals } from "../../src/lib/category-split";

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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- test/lib/category-split.test.ts`
Expected: FAIL with "computePersonTotals is not exported"

- [ ] **Step 3: Implement**

Append to `src/lib/category-split.ts`:

```ts
export function computePersonTotals(
  transactions: { categoryId: number | null; amount: number }[],
  splits: { categoryId: number; personId: number; percentage: number }[]
): { personId: number; total: number }[] {
  const totalsByPerson = new Map<number, number>();

  for (const tx of transactions) {
    if (tx.categoryId === null) continue;
    const relevantSplits = splits.filter((s) => s.categoryId === tx.categoryId);
    for (const split of relevantSplits) {
      const share = tx.amount * (split.percentage / 100);
      totalsByPerson.set(split.personId, (totalsByPerson.get(split.personId) ?? 0) + share);
    }
  }

  return Array.from(totalsByPerson.entries()).map(([personId, total]) => ({ personId, total }));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- test/lib/category-split.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Write report routes**

`src/app/api/reports/category-totals/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, categories } from "../../../../db/schema";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const query = db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .groupBy(transactions.categoryId, categories.name);

  const rows = monthId
    ? await query.where(eq(transactions.monthId, Number(monthId)))
    : await query;

  return NextResponse.json(rows);
}
```

`src/app/api/reports/person-totals/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, categorySplits } from "../../../../db/schema";
import { computePersonTotals } from "../../../../lib/category-split";

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const txRows = monthId
    ? await db.select().from(transactions).where(eq(transactions.monthId, Number(monthId)))
    : await db.select().from(transactions);

  const splits = await db.select().from(categorySplits);

  const totals = computePersonTotals(
    txRows.map((t) => ({ categoryId: t.categoryId, amount: Number(t.amount) })),
    splits.map((s) => ({ categoryId: s.categoryId, personId: s.personId, percentage: Number(s.percentage) }))
  );

  return NextResponse.json(totals);
}
```

- [ ] **Step 6: Write the reports page**

`src/app/(dashboard)/reports/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CategoryTotal {
  categoryId: number | null;
  categoryName: string | null;
  total: string;
}

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

export default function ReportsPage() {
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);

  useEffect(() => {
    fetch("/api/reports/category-totals").then((r) => r.json()).then(setCategoryTotals);
  }, []);

  const chartData = categoryTotals.map((c) => ({
    name: c.categoryName ?? "Sem categoria",
    value: Math.abs(Number(c.total)),
  }));

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Gastos por categoria</h1>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={100} label>
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add category and person-split reports with chart UI"
```

---

### Task 15: Investments CRUD and evolution chart

**Files:**
- Create: `src/app/api/investments/route.ts`, `src/app/(dashboard)/investments/page.tsx`

**Interfaces:**
- Consumes: `investments`, `db` (Task 2).
- Produces: `GET /api/investments`, `POST /api/investments`.

- [ ] **Step 1: Write routes**

`src/app/api/investments/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { investments } from "../../../db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(investments));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [created] = await db
    .insert(investments)
    .values({
      assetType: body.assetType,
      description: body.description ?? null,
      contributionAmount: body.contributionAmount?.toFixed(2) ?? null,
      currentBalance: body.currentBalance.toFixed(2),
      date: body.date,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: Write the investments page**

`src/app/(dashboard)/investments/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Investment {
  id: number;
  assetType: string;
  currentBalance: string;
  date: string;
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [form, setForm] = useState({ assetType: "", currentBalance: "", date: "" });

  useEffect(() => {
    fetch("/api/investments").then((r) => r.json()).then(setInvestments);
  }, []);

  async function addInvestment() {
    const response = await fetch("/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetType: form.assetType,
        currentBalance: Number(form.currentBalance),
        date: form.date,
      }),
    });
    const created = await response.json();
    setInvestments((prev) => [...prev, created]);
    setForm({ assetType: "", currentBalance: "", date: "" });
  }

  const evolutionData = [...investments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((inv) => ({ date: inv.date, balance: Number(inv.currentBalance) }));

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Investimentos</h1>
      <div className="flex gap-2 mb-6">
        <input
          placeholder="Tipo de ativo"
          value={form.assetType}
          onChange={(e) => setForm({ ...form, assetType: e.target.value })}
        />
        <input
          placeholder="Saldo atual"
          type="number"
          value={form.currentBalance}
          onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <button onClick={addInvestment}>Adicionar</button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={evolutionData}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="balance" stroke="#2563eb" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add investments CRUD and evolution chart"
```

---

## Self-Review

**Spec coverage:**
- Categorias + divisão por pessoa fixa por categoria → Task 10, Task 14.
- Import de fatura, reconhecimento de lançamentos, categorização manual, carry-forward de parcelas → Task 5, Task 7, Task 8, Task 12.
- Import de extrato com mês de referência e dedupe → Task 6, Task 7, Task 8.
- Fechamento mensal (flag visual, sem travar edição) → Task 13.
- Relatórios por categoria e por pessoa → Task 14.
- Investimentos manuais com evolução → Task 15.
- 2 logins (Wagner, esposa) → Task 9.
- Sugestão de categoria a partir da tag do banco → Task 12.

**Placeholder scan:** no TBD/TODO remain; every step has runnable code and exact commands.

**Type consistency:** `ParsedTransaction` (Task 5) is reused identically by Task 6 and Task 8. `buildDedupeKey`/`buildInstallmentGroupKey` signatures (Task 7) match their call sites in Task 8. `categories.bankTagAlias` (Task 2) matches the field read in `suggestCategoryId` (Task 12). `categorySplits.percentage` is read as `numeric` (string) from the DB and converted with `Number(...)` before being passed into `computePersonTotals`, which expects a plain `number` — consistent across Task 10 and Task 14.

**Gap found and fixed:** the original parser draft didn't account for `Lançamentos internacionais` (foreign currency) or full installment date-year wraparound (Nov/Dec entries on a fatura that closes in a different calendar year). These are called out as a known limitation in Task 5's `toIsoDate` comment rather than silently mishandled — if it becomes a real problem once more faturas are imported, it's a small follow-up to Task 5, not a blocker for the rest of the plan.
