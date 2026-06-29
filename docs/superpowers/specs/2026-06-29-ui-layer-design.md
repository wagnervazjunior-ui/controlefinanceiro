# UI Layer — Design

## Context and goal

The backend (parsers, import service, CRUD APIs, auth, reports) was built and reviewed across 15 tasks (see [2026-06-29-controle-financeiro-design.md](2026-06-29-controle-financeiro-design.md) and its implementation plan). A final whole-branch review found that no usable UI exists: no login page, no navigation, no import page, no category/people/card/bank-account management page, and the root page is still the default Next.js template. With `AUTH_SECRET` correctly enforcing auth, the app is currently 100% unreachable by a human.

This spec covers building the missing UI layer on top of the existing APIs — no new backend logic.

## Layout and navigation

`src/app/(dashboard)/layout.tsx` wraps every authenticated page with a fixed left sidebar containing links: Transações, Importar, Relatórios, Investimentos, Cadastros. The sidebar is a server component (static links, no per-page state). Existing pages (`transactions`, `reports`, `investments`) move under this layout if not already, and the layout renders `{children}` to its right in a simple flex/grid container (Tailwind, consistent with existing page styling).

## Login page

`src/app/login/page.tsx` (outside the `(dashboard)` route group, since it must render before/without auth). Client component: email + password fields, a submit handler calling NextAuth's `signIn("credentials", { email, password, redirect: false })`. On success, `router.push("/transactions")`. On failure, show an inline error message ("Email ou senha inválidos") without redirecting. No "forgot password" or signup — out of scope, matches the 2-fixed-accounts design.

## Root page

`src/app/page.tsx` becomes a server component that calls `auth()` (from `src/lib/auth.ts`) and redirects: to `/transactions` if a session exists, to `/login` otherwise. Replaces the current create-next-app template content entirely.

## Import page

`src/app/(dashboard)/import/page.tsx`. Single page, two sections (client component):

- **Fatura**: file input (PDF), `<select>` populated from `GET /api/cards`, a year number input (`referenceYear`). Submit does a `multipart/form-data` POST to `/api/statement-imports/fatura`.
- **Extrato**: file input (PDF), `<select>` populated from `GET /api/bank-accounts`, year and month number inputs. Submit POSTs to `/api/statement-imports/extrato`.

After either submit, the page shows the returned `{ created, skipped }` counts inline and a link to `/transactions` (the existing uncategorized-transactions page). No redirect — the counts must stay visible until the user clicks through, since the spec calls for showing the result before moving on.

## Settings page (cadastros)

`src/app/(dashboard)/settings/page.tsx`. Single page, client-side tab state (no routing per tab — just local `useState` for the active tab, since these are small lists with no deep-linking requirement). Four tabs:

- **Categorias**: list + add form (name, optional bank tag alias) using `GET/POST /api/categories`. Each category row expands to an inline split editor: a row per existing `person` with a percentage input, "Salvar splits" button calling `PUT /api/categories/[id]/splits`. People available for splits come from the Pessoas tab's data (fetched once, shared across tabs via the page's top-level state).
- **Pessoas**: list + add form (name) using `GET/POST /api/people`.
- **Cartões**: list + add form (name, last four digits, bank) using `GET/POST /api/cards`.
- **Contas Bancárias**: list + add form (name, bank) using `GET/POST /api/bank-accounts`.

All four tabs follow the exact fetch-on-mount + POST-then-refetch client component pattern already used in `transactions/page.tsx`, `reports/page.tsx`, and `investments/page.tsx` — no new state-management pattern introduced.

## Out of scope

- Edit/delete for categories, people, cards, bank accounts (the existing APIs only support GET/POST; add PATCH/DELETE only if explicitly requested later).
- Signup, password reset, multi-tenant accounts.
- Mobile-specific layout beyond what Tailwind's default responsive utilities give for free.
- Visual polish/design system beyond what's already established by the existing 3 pages' Tailwind usage.

## Testing

These are client-side pages wired to already-tested APIs. Verification is `npm run build` (type/compile check) plus manual exercise of each page against the real dev server and real Neon DB (login with a seeded test account, upload a real fatura/extrato PDF, add a category/person/card/bank-account, set splits) — consistent with how Task 12's UI page was verified. No new automated UI tests are planned; the API layer underneath already has integration test coverage.
