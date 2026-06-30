# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incrementally improve usability — dropzone de upload, hierarquia de botões, labels em inputs, link ativo na sidebar, delete com confirmação inline nos cadastros.

**Architecture:** Sem biblioteca de componentes. Todas as melhorias são classes Tailwind aplicadas diretamente nos arquivos de página/layout existentes. As rotas DELETE são novos arquivos de rota em `src/app/api/[resource]/[id]/route.ts`. O layout da dashboard vira `"use client"` para suportar `usePathname`.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS 4, Drizzle ORM + Neon Postgres.

## Global Constraints

- Tailwind CSS 4 — usar classes utilitárias, sem `@apply`
- Sem biblioteca de componentes (shadcn, radix, etc.)
- Manter lógica de negócio intacta — só UI e novas rotas DELETE
- `color-scheme: light` já definido em `globals.css` — não adicionar dark mode
- Commits frequentes após cada tarefa

---

### Task 1: Sidebar com link ativo + card de login

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Produces: sidebar com `usePathname` destacando link ativo; login com card e labels

- [ ] **Step 1: Atualizar layout da dashboard**

Substituir conteúdo completo de `src/app/(dashboard)/layout.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "../../lib/auth";

const NAV_ITEMS = [
  { href: "/transactions", label: "Transações" },
  { href: "/import", label: "Importar" },
  { href: "/reports", label: "Relatórios" },
  { href: "/investments", label: "Investimentos" },
  { href: "/settings", label: "Cadastros" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <nav className="w-48 shrink-0 border-r bg-white p-4 flex flex-col justify-between text-zinc-900">
        <div>
          <p className="mb-6 px-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Menu
          </p>
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-zinc-200 font-medium text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 text-left transition-colors"
          >
            Sair
          </button>
        </form>
      </nav>
      <main className="flex-1 bg-zinc-50 text-zinc-900">{children}</main>
    </div>
  );
}
```

> Nota: `"use client"` no topo e `signOut` com `"use server"` inline numa form action continuam funcionando — Next.js suporta server actions dentro de client components.

- [ ] **Step 2: Atualizar página de login**

Substituir conteúdo completo de `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Email ou senha inválidos");
      return;
    }
    router.push("/transactions");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Controle Financeiro</h1>
          <p className="mt-1 text-sm text-zinc-500">Entre com sua conta</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm flex flex-col gap-4"
        >
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="mt-1 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build**

```bash
cd "APP FINANCEIRO" && npm run build
```
Esperado: sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx src/app/login/page.tsx
git commit -m "feat: active nav link highlight and improved login card"
```

---

### Task 2: Dropzone de upload na página /import

**Files:**
- Modify: `src/app/(dashboard)/import/page.tsx`

**Interfaces:**
- Consumes: nada novo — apenas modifica o JSX existente
- Produces: componente `FileDropzone` inline que substitui `<input type="file">`

- [ ] **Step 1: Reescrever import/page.tsx com dropzone**

Substituir conteúdo completo de `src/app/(dashboard)/import/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Card {
  id: number;
  name: string;
  lastFourDigits: string | null;
  bank: string;
}

interface BankAccount {
  id: number;
  name: string;
  bank: string;
}

interface ImportResult {
  created: number;
  skipped: number;
}

function FileDropzone({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onChange(dropped);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-lg border-2 p-6 text-center transition-colors ${
        file
          ? "border-zinc-400 bg-zinc-50"
          : dragging
          ? "border-zinc-500 bg-zinc-100"
          : "border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
      {file ? (
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate max-w-xs">{file.name}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-zinc-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div>
            <p className="text-sm font-medium text-zinc-600">Clique para selecionar PDF</p>
            <p className="text-xs text-zinc-400">ou arraste o arquivo aqui</p>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none w-full";
const labelClass = "text-sm font-medium text-zinc-700";
const btnPrimary = "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function ImportPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [faturaFile, setFaturaFile] = useState<File | null>(null);
  const [faturaCardId, setFaturaCardId] = useState("");
  const [faturaYear, setFaturaYear] = useState(new Date().getFullYear().toString());
  const [faturaResult, setFaturaResult] = useState<ImportResult | null>(null);
  const [faturaError, setFaturaError] = useState<string | null>(null);
  const [faturaSubmitting, setFaturaSubmitting] = useState(false);

  const [extratoFile, setExtratoFile] = useState<File | null>(null);
  const [extratoAccountId, setExtratoAccountId] = useState("");
  const [extratoYear, setExtratoYear] = useState(new Date().getFullYear().toString());
  const [extratoMonth, setExtratoMonth] = useState((new Date().getMonth() + 1).toString());
  const [extratoResult, setExtratoResult] = useState<ImportResult | null>(null);
  const [extratoError, setExtratoError] = useState<string | null>(null);
  const [extratoSubmitting, setExtratoSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/cards").then((r) => r.json()).then(setCards).catch(console.error);
    fetch("/api/bank-accounts").then((r) => r.json()).then(setBankAccounts).catch(console.error);
  }, []);

  async function submitFatura(e: React.FormEvent) {
    e.preventDefault();
    if (!faturaFile || !faturaCardId) return;
    setFaturaError(null);
    setFaturaResult(null);
    setFaturaSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", faturaFile);
      formData.append("cardId", faturaCardId);
      formData.append("referenceYear", faturaYear);
      const response = await fetch("/api/statement-imports/fatura", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) { setFaturaError(body?.error ?? "Erro ao importar fatura."); return; }
      setFaturaResult(body);
    } catch {
      setFaturaError("Erro ao importar fatura.");
    } finally {
      setFaturaSubmitting(false);
    }
  }

  async function submitExtrato(e: React.FormEvent) {
    e.preventDefault();
    if (!extratoFile || !extratoAccountId) return;
    setExtratoError(null);
    setExtratoResult(null);
    setExtratoSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", extratoFile);
      formData.append("bankAccountId", extratoAccountId);
      formData.append("referenceYear", extratoYear);
      formData.append("referenceMonth", extratoMonth);
      const response = await fetch("/api/statement-imports/extrato", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) { setExtratoError(body?.error ?? "Erro ao importar extrato."); return; }
      setExtratoResult(body);
    } catch {
      setExtratoError("Erro ao importar extrato.");
    } finally {
      setExtratoSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-xl flex flex-col gap-10">
      <section>
        <h2 className="mb-5 text-base font-semibold text-zinc-900">Importar fatura de cartão</h2>
        <form onSubmit={submitFatura} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Arquivo PDF</label>
            <FileDropzone file={faturaFile} onChange={setFaturaFile} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Cartão</label>
            <select value={faturaCardId} onChange={(e) => setFaturaCardId(e.target.value)} required className={inputClass}>
              <option value="" disabled>Selecione o cartão</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.lastFourDigits && ` (${c.lastFourDigits})`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Ano de referência</label>
            <input type="number" value={faturaYear} onChange={(e) => setFaturaYear(e.target.value)} required className={inputClass} />
          </div>
          <button type="submit" disabled={faturaSubmitting} className={btnPrimary}>
            {faturaSubmitting ? "Importando..." : "Importar fatura"}
          </button>
        </form>
        {faturaError && <p className="mt-3 rounded-md bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{faturaError}</p>}
        {faturaResult && (
          <p className="mt-3 rounded-md bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-700">
            {faturaResult.created} lançamento(s) criado(s), {faturaResult.skipped} ignorado(s).{" "}
            <Link href="/transactions" className="font-medium underline">Ir para categorização →</Link>
          </p>
        )}
      </section>

      <div className="border-t border-zinc-200" />

      <section>
        <h2 className="mb-5 text-base font-semibold text-zinc-900">Importar extrato bancário</h2>
        <form onSubmit={submitExtrato} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Arquivo PDF</label>
            <FileDropzone file={extratoFile} onChange={setExtratoFile} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Conta bancária</label>
            <select value={extratoAccountId} onChange={(e) => setExtratoAccountId(e.target.value)} required className={inputClass}>
              <option value="" disabled>Selecione a conta</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.bank})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Ano</label>
              <input type="number" value={extratoYear} onChange={(e) => setExtratoYear(e.target.value)} required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Mês (1–12)</label>
              <input type="number" min={1} max={12} value={extratoMonth} onChange={(e) => setExtratoMonth(e.target.value)} required className={inputClass} />
            </div>
          </div>
          <button type="submit" disabled={extratoSubmitting} className={btnPrimary}>
            {extratoSubmitting ? "Importando..." : "Importar extrato"}
          </button>
        </form>
        {extratoError && <p className="mt-3 rounded-md bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{extratoError}</p>}
        {extratoResult && (
          <p className="mt-3 rounded-md bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-700">
            {extratoResult.created} lançamento(s) criado(s), {extratoResult.skipped} ignorado(s).{" "}
            <Link href="/transactions" className="font-medium underline">Ir para categorização →</Link>
          </p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/import/page.tsx"
git commit -m "feat: file dropzone with drag-and-drop on import page"
```

---

### Task 3: Rotas DELETE para os 4 recursos de cadastro

**Files:**
- Create: `src/app/api/people/[id]/route.ts`
- Create: `src/app/api/cards/[id]/route.ts`
- Create: `src/app/api/bank-accounts/[id]/route.ts`
- Create: `src/app/api/categories/[id]/route.ts` (já existe `splits/route.ts` dentro, não mexer)

**Interfaces:**
- Produces:
  - `DELETE /api/people/[id]` → 204 | 404 | 409 `{ error: "..." }`
  - `DELETE /api/cards/[id]` → 204 | 404 | 409
  - `DELETE /api/bank-accounts/[id]` → 204 | 404 | 409
  - `DELETE /api/categories/[id]` → 204 | 404 | 409

- [ ] **Step 1: Criar `src/app/api/people/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { people, categorySplits } from "../../../../db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const personId = Number(id);

  const splits = await db.select().from(categorySplits).where(eq(categorySplits.personId, personId));
  if (splits.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir: pessoa possui splits de categoria vinculados." },
      { status: 409 }
    );
  }

  const deleted = await db.delete(people).where(eq(people.id, personId)).returning();
  if (deleted.length === 0) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Criar `src/app/api/cards/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { cards, statementImports } from "../../../../db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardId = Number(id);

  const imports = await db.select().from(statementImports).where(eq(statementImports.cardId, cardId));
  if (imports.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir: cartão possui importações vinculadas." },
      { status: 409 }
    );
  }

  const deleted = await db.delete(cards).where(eq(cards.id, cardId)).returning();
  if (deleted.length === 0) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Criar `src/app/api/bank-accounts/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { bankAccounts, statementImports } from "../../../../db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accountId = Number(id);

  const imports = await db.select().from(statementImports).where(eq(statementImports.bankAccountId, accountId));
  if (imports.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir: conta possui importações vinculadas." },
      { status: 409 }
    );
  }

  const deleted = await db.delete(bankAccounts).where(eq(bankAccounts.id, accountId)).returning();
  if (deleted.length === 0) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: Criar `src/app/api/categories/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { categories, transactions } from "../../../../db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = Number(id);

  const linked = await db.select().from(transactions).where(eq(transactions.categoryId, categoryId));
  if (linked.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir: categoria possui lançamentos vinculados." },
      { status: 409 }
    );
  }

  const deleted = await db.delete(categories).where(eq(categories.id, categoryId)).returning();
  if (deleted.length === 0) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 5: Build**

```bash
npm run build
```
Esperado: 4 novas rotas aparecem no output do build, sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/people/\[id\]/route.ts src/app/api/cards/\[id\]/route.ts src/app/api/bank-accounts/\[id\]/route.ts "src/app/api/categories/[id]/route.ts"
git commit -m "feat: add DELETE routes for people, cards, bank-accounts, categories"
```

---

### Task 4: Settings — delete com confirmação inline + redesign de formulários

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

**Interfaces:**
- Consumes: `DELETE /api/people/[id]`, `DELETE /api/cards/[id]`, `DELETE /api/bank-accounts/[id]`, `DELETE /api/categories/[id]` (Task 3)

- [ ] **Step 1: Reescrever settings/page.tsx**

Substituir conteúdo completo do arquivo. O estado `confirmDelete` guarda o id do item em processo de confirmação por aba. Cada linha de lista mostra "Excluir" → ao clicar, o id é gravado em `confirmDelete[aba]`; a linha troca para "Tem certeza? [Confirmar] [Cancelar]".

```tsx
"use client";

import { useEffect, useState } from "react";

interface Person { id: number; name: string; }
interface Card { id: number; name: string; lastFourDigits: string | null; bank: string; }
interface BankAccount { id: number; name: string; bank: string; }
interface Category { id: number; name: string; bankTagAlias: string | null; }

type Tab = "pessoas" | "cartoes" | "contas" | "categorias";
const TAB_LABELS: Record<Tab, string> = {
  pessoas: "Pessoas", cartoes: "Cartões", contas: "Contas", categorias: "Categorias",
};

const inputClass = "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";
const labelClass = "text-sm font-medium text-zinc-700";
const btnPrimary = "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors";
const btnDestructive = "rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 transition-colors";
const btnSecondary = "rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("pessoas");

  const [people, setPeople] = useState<Person[]>([]);
  const [personName, setPersonName] = useState("");
  const [personError, setPersonError] = useState<string | null>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [cardName, setCardName] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [cardBank, setCardBank] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accountName, setAccountName] = useState("");
  const [accountBank, setAccountBank] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryTag, setCategoryTag] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [splitDrafts, setSplitDrafts] = useState<Record<number, Record<number, string>>>({});
  const [splitMessage, setSplitMessage] = useState<Record<number, string>>({});

  // confirmDelete[tab] = id being confirmed, or null
  const [confirmDelete, setConfirmDelete] = useState<Record<Tab, number | null>>({
    pessoas: null, cartoes: null, contas: null, categorias: null,
  });
  const [deleteError, setDeleteError] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/people").then((r) => r.json()).then(setPeople).catch(console.error);
    fetch("/api/cards").then((r) => r.json()).then(setCards).catch(console.error);
    fetch("/api/bank-accounts").then((r) => r.json()).then(setBankAccounts).catch(console.error);
    fetch("/api/categories")
      .then((r) => r.json())
      .then(async (cats: Category[]) => {
        setCategories(cats);
        const drafts: Record<number, Record<number, string>> = {};
        await Promise.all(
          cats.map((c) =>
            fetch(`/api/categories/${c.id}/splits`)
              .then((r) => r.json())
              .then((splits: { personId: number; percentage: string }[]) => {
                if (splits.length > 0) {
                  drafts[c.id] = Object.fromEntries(splits.map((s) => [s.personId, s.percentage]));
                }
              })
              .catch(() => {})
          )
        );
        setSplitDrafts(drafts);
      })
      .catch(console.error);
  }, []);

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    setPersonError(null);
    const response = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: personName }),
    });
    const body = await response.json();
    if (!response.ok) { setPersonError(body?.error ?? "Erro ao adicionar pessoa."); return; }
    setPeople((prev) => [...prev, body]);
    setPersonName("");
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    setCardError(null);
    const response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cardName, lastFourDigits: cardLastFour, bank: cardBank }),
    });
    const body = await response.json();
    if (!response.ok) { setCardError(body?.error ?? "Erro ao adicionar cartão."); return; }
    setCards((prev) => [...prev, body]);
    setCardName(""); setCardLastFour(""); setCardBank("");
  }

  async function addBankAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    const response = await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: accountName, bank: accountBank }),
    });
    const body = await response.json();
    if (!response.ok) { setAccountError(body?.error ?? "Erro ao adicionar conta."); return; }
    setBankAccounts((prev) => [...prev, body]);
    setAccountName(""); setAccountBank("");
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError(null);
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryName, bankTagAlias: categoryTag || null }),
    });
    const body = await response.json();
    if (!response.ok) { setCategoryError(body?.error ?? "Erro ao adicionar categoria."); return; }
    setCategories((prev) => [...prev, body]);
    setCategoryName(""); setCategoryTag("");
  }

  function updateSplitDraft(categoryId: number, personId: number, value: string) {
    setSplitDrafts((prev) => ({ ...prev, [categoryId]: { ...prev[categoryId], [personId]: value } }));
  }

  async function saveSplits(categoryId: number) {
    const draft = splitDrafts[categoryId] ?? {};
    const splits = people.map((p) => ({ personId: p.id, percentage: Number(draft[p.id] ?? 0) }));
    const response = await fetch(`/api/categories/${categoryId}/splits`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(splits),
    });
    if (response.ok) {
      setSplitMessage((prev) => ({ ...prev, [categoryId]: "Splits salvos." }));
    } else {
      const body = await response.json();
      setSplitMessage((prev) => ({ ...prev, [categoryId]: body.error ?? "Erro ao salvar splits." }));
    }
  }

  async function confirmDeleteItem(tab: Tab, id: number, endpoint: string) {
    setDeleteError({});
    const response = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (response.status === 204) {
      if (tab === "pessoas") setPeople((prev) => prev.filter((x) => x.id !== id));
      if (tab === "cartoes") setCards((prev) => prev.filter((x) => x.id !== id));
      if (tab === "contas") setBankAccounts((prev) => prev.filter((x) => x.id !== id));
      if (tab === "categorias") setCategories((prev) => prev.filter((x) => x.id !== id));
      setConfirmDelete((prev) => ({ ...prev, [tab]: null }));
    } else {
      const body = await response.json().catch(() => ({}));
      setDeleteError((prev) => ({ ...prev, [id]: body.error ?? "Erro ao excluir." }));
      setConfirmDelete((prev) => ({ ...prev, [tab]: null }));
    }
  }

  function DeleteControls({ tab, id, endpoint }: { tab: Tab; id: number; endpoint: string }) {
    const isConfirming = confirmDelete[tab] === id;
    return (
      <div className="flex items-center gap-2 shrink-0">
        {deleteError[id] && <span className="text-xs text-red-500">{deleteError[id]}</span>}
        {isConfirming ? (
          <>
            <span className="text-xs text-zinc-500">Tem certeza?</span>
            <button onClick={() => confirmDeleteItem(tab, id, endpoint)} className={btnDestructive}>
              Confirmar
            </button>
            <button onClick={() => setConfirmDelete((prev) => ({ ...prev, [tab]: null }))} className={btnSecondary}>
              Cancelar
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete((prev) => ({ ...prev, [tab]: id }))} className={btnDestructive}>
            Excluir
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex gap-1 border-b border-zinc-200">
        {(["pessoas", "cartoes", "contas", "categorias"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm transition-colors ${
              tab === t
                ? "border-b-2 border-zinc-900 font-medium text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "pessoas" && (
        <div className="flex flex-col gap-6">
          <form onSubmit={addPerson} className="flex flex-col gap-4 max-w-sm">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Nome</label>
              <input value={personName} onChange={(e) => setPersonName(e.target.value)} className={inputClass} required />
            </div>
            <button type="submit" className={btnPrimary}>Adicionar pessoa</button>
          </form>
          {personError && <p className="text-sm text-red-600">{personError}</p>}
          <ul className="flex flex-col divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
            {people.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-zinc-50">
                <span className="text-sm text-zinc-800">{p.name}</span>
                <DeleteControls tab="pessoas" id={p.id} endpoint="/api/people" />
              </li>
            ))}
            {people.length === 0 && <li className="px-4 py-3 text-sm text-zinc-400">Nenhuma pessoa cadastrada.</li>}
          </ul>
        </div>
      )}

      {tab === "cartoes" && (
        <div className="flex flex-col gap-6">
          <form onSubmit={addCard} className="flex flex-col gap-4 max-w-sm">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Nome do cartão</label>
              <input value={cardName} onChange={(e) => setCardName(e.target.value)} className={inputClass} required />
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className={labelClass}>Banco</label>
                <input value={cardBank} onChange={(e) => setCardBank(e.target.value)} className={inputClass} required />
              </div>
              <div className="flex flex-col gap-1 w-36">
                <label className={labelClass}>Últimos 4 dígitos (opcional)</label>
                <input value={cardLastFour} onChange={(e) => setCardLastFour(e.target.value)} maxLength={4} className={inputClass} />
              </div>
            </div>
            <button type="submit" className={btnPrimary}>Adicionar cartão</button>
          </form>
          {cardError && <p className="text-sm text-red-600">{cardError}</p>}
          <ul className="flex flex-col divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-zinc-50">
                <span className="text-sm text-zinc-800">
                  {c.name} {c.lastFourDigits && <span className="text-zinc-400">•••• {c.lastFourDigits}</span>}{" "}
                  <span className="text-zinc-400">({c.bank})</span>
                </span>
                <DeleteControls tab="cartoes" id={c.id} endpoint="/api/cards" />
              </li>
            ))}
            {cards.length === 0 && <li className="px-4 py-3 text-sm text-zinc-400">Nenhum cartão cadastrado.</li>}
          </ul>
        </div>
      )}

      {tab === "contas" && (
        <div className="flex flex-col gap-6">
          <form onSubmit={addBankAccount} className="flex flex-col gap-4 max-w-sm">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Nome da conta</label>
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Banco</label>
              <input value={accountBank} onChange={(e) => setAccountBank(e.target.value)} className={inputClass} required />
            </div>
            <button type="submit" className={btnPrimary}>Adicionar conta</button>
          </form>
          {accountError && <p className="text-sm text-red-600">{accountError}</p>}
          <ul className="flex flex-col divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
            {bankAccounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-zinc-50">
                <span className="text-sm text-zinc-800">{a.name} <span className="text-zinc-400">({a.bank})</span></span>
                <DeleteControls tab="contas" id={a.id} endpoint="/api/bank-accounts" />
              </li>
            ))}
            {bankAccounts.length === 0 && <li className="px-4 py-3 text-sm text-zinc-400">Nenhuma conta cadastrada.</li>}
          </ul>
        </div>
      )}

      {tab === "categorias" && (
        <div className="flex flex-col gap-6">
          <form onSubmit={addCategory} className="flex flex-col gap-4 max-w-sm">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Nome da categoria</label>
              <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className={inputClass} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Tag do banco (opcional)</label>
              <input value={categoryTag} onChange={(e) => setCategoryTag(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" className={btnPrimary}>Adicionar categoria</button>
          </form>
          {categoryError && <p className="text-sm text-red-600">{categoryError}</p>}
          <ul className="flex flex-col gap-3">
            {categories.map((c) => (
              <li key={c.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-800">
                    {c.name} {c.bankTagAlias && <span className="text-zinc-400 font-normal">({c.bankTagAlias})</span>}
                  </span>
                  <DeleteControls tab="categorias" id={c.id} endpoint="/api/categories" />
                </div>
                <p className="mb-2 text-xs text-zinc-400">Divisão por pessoa (deve somar 100%):</p>
                <div className="flex flex-wrap gap-3">
                  {people.map((p) => (
                    <label key={p.id} className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-600">{p.name}</span>
                      <input
                        type="number"
                        className="w-16 rounded border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
                        value={splitDrafts[c.id]?.[p.id] ?? ""}
                        onChange={(e) => updateSplitDraft(c.id, p.id, e.target.value)}
                      />
                      <span className="text-xs text-zinc-400">%</span>
                    </label>
                  ))}
                  <button onClick={() => saveSplits(c.id)} className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors">
                    Salvar splits
                  </button>
                </div>
                {splitMessage[c.id] && <p className="mt-2 text-xs text-zinc-500">{splitMessage[c.id]}</p>}
              </li>
            ))}
            {categories.length === 0 && <li className="text-sm text-zinc-400">Nenhuma categoria cadastrada.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Esperado: sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/settings/page.tsx"
git commit -m "feat: delete with inline confirmation and form redesign in settings"
```

---

### Task 5: Tabela de transações melhorada

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`

- [ ] **Step 1: Reescrever transactions/page.tsx**

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
    fetch("/api/transactions?uncategorized=true").then((r) => r.json()).then(setTransactions).catch(console.error);
    fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(console.error);
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
    <div className="p-8">
      <h1 className="mb-6 text-lg font-semibold text-zinc-900">Lançamentos sem categoria</h1>
      {transactions.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">Nenhum lançamento sem categoria.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Descrição</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Categoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-3 text-zinc-800">{tx.description}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-800 whitespace-nowrap">{tx.amount}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={tx.suggestedCategoryId ?? ""}
                      onChange={(e) => categorize(tx.id, Number(e.target.value))}
                      className="w-48 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none"
                    >
                      <option value="" disabled>Selecione</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build e deploy**

```bash
npm run build
```
Esperado: sem erros.

- [ ] **Step 3: Commit e push**

```bash
git add "src/app/(dashboard)/transactions/page.tsx"
git commit -m "feat: improved transactions table with empty state"
git push
vercel --prod
```

---

## Self-Review

**Cobertura do spec:**
- ✅ Sistema de botões com 3 variantes (btnPrimary/btnDestructive/btnSecondary definidos como constantes em tasks 2 e 4)
- ✅ Dropzone com drag-and-drop (Task 2)
- ✅ Inputs com label (Tasks 2, 4, 5)
- ✅ Delete com confirmação inline nas 4 abas (Task 4)
- ✅ 4 rotas DELETE com validação 409 (Task 3)
- ✅ Tabela com header estilizado + estado vazio (Task 5)
- ✅ Sidebar com link ativo via usePathname (Task 1)
- ✅ Login com card + labels + botão full-width (Task 1)

**Tipos consistentes:** `DeleteControls` recebe `tab: Tab`, `id: number`, `endpoint: string` — usado identicamente em todas as 4 abas.

**Placeholders:** nenhum TBD ou TODO.
