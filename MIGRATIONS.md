# Migrações de banco (Drizzle + Neon)

## Regra de ouro

**Nunca edite o schema e faça deploy sem aplicar a migração no banco.** Se o
código lê uma coluna que ainda não existe no banco, **toda query daquela tabela
quebra** e a tela aparece vazia (foi o que aconteceu com `exclude_from_reports`).

## Fluxo correto para qualquer mudança de schema

1. Edite `src/db/schema.ts`.
2. Gere a migração (isso cria o `.sql` **e** registra no journal do Drizzle):
   ```bash
   npm run db:generate
   ```
3. Aplique no banco:
   ```bash
   npm run db:migrate
   ```
4. Só então faça commit + push do schema junto com o arquivo em `drizzle/`.

## O que NÃO fazer

- ❌ Escrever o arquivo `drizzle/000X_*.sql` à mão. O `db:migrate` só aplica o
  que está em `drizzle/meta/_journal.json`; um `.sql` solto é ignorado, o banco
  fica sem a coluna e o código quebra.
- ❌ Fazer deploy do código antes de aplicar a migração no banco de produção.

## Histórico / dívida técnica

As migrações `0002_add_people_is_main.sql` e `0003_add_exclude_from_reports.sql`
foram escritas à mão e **não estão** no `_journal.json`. As colunas
correspondentes (`people.is_main`, `categories.exclude_from_reports`) já foram
aplicadas manualmente no banco via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
A partir daqui, use sempre `db:generate` para não repetir esse problema.

## Aplicar SQL avulso no banco (emergência)

```bash
node --env-file=.env.local -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...\`.then(()=>console.log('ok'));
"
```
