# UI Redesign — Refinamento Incremental

## Contexto

O app de controle financeiro está funcional mas tem problemas de usabilidade: área de upload de arquivo não é visualmente óbvia, botões não têm hierarquia visual, inputs não têm labels, e não existe opção de excluir cadastros. Este spec cobre melhorias incrementais sem alterar o layout estrutural existente.

Stack: Next.js 16, Tailwind CSS 4, sem biblioteca de componentes.

---

## 1. Sistema base de botões

Três variantes, aplicadas consistentemente em todas as páginas:

- **Primário**: `bg-zinc-900 text-white hover:bg-zinc-700 rounded px-4 py-2 text-sm font-medium` — ações principais (importar, salvar, adicionar)
- **Destrutivo**: `border border-red-200 text-red-600 hover:bg-red-50 rounded px-3 py-1 text-sm` — excluir (confirmação inline)
- **Secundário**: `border border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded px-3 py-1 text-sm` — confirmar/cancelar em fluxo de delete

Estado `disabled`: `opacity-50 cursor-not-allowed` em todos os variantes.

---

## 2. Upload de arquivo (dropzone)

Substituir `<input type="file">` puro por uma área clicável estilizada. O input real fica `hidden`; a div chama `inputRef.current.click()` no onClick.

**Estados visuais:**
- **Vazio**: `border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100 rounded-lg p-6 text-center cursor-pointer` com ícone de upload (SVG inline) e texto "Clique para selecionar PDF ou arraste aqui"
- **Arquivo selecionado**: borda sólida `border-zinc-400`, fundo `bg-zinc-50`, mostra nome do arquivo com ícone de documento

Aplicado nas duas seções da página `/import` (fatura e extrato). Suporta drag-and-drop via eventos `onDragOver`/`onDrop`.

---

## 3. Inputs com label

Todos os campos de formulário ganham `<label>` explícita acima do input:

```tsx
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-zinc-700">Nome</label>
  <input className="rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none" />
</div>
```

Aplicado em: formulários de cadastro em Settings, campos de import (ano, mês), campos de login.

Selects recebem o mesmo tratamento visual: `border border-zinc-300 rounded px-3 py-2 text-sm bg-white`.

---

## 4. Excluir cadastros

Cada linha nas 4 abas de Settings (Pessoas, Cartões, Contas, Categorias) ganha um botão "Excluir" à direita, com confirmação inline:

**Fluxo:**
1. Clique em "Excluir" → linha mostra `"Tem certeza? [Confirmar] [Cancelar]"` inline
2. Confirmar → `DELETE /api/people/:id` (ou cards, bank-accounts, categories) → remove da lista local
3. Cancelar → volta ao estado normal
4. Erro 409 da API → mostra `"Não é possível excluir: existem registros vinculados"` na linha

**Rotas DELETE a criar:**
- `DELETE /api/people/[id]`
- `DELETE /api/cards/[id]`
- `DELETE /api/bank-accounts/[id]`
- `DELETE /api/categories/[id]` — verificar se há lançamentos vinculados (transactions.categoryId); retornar 409 se houver

Para pessoas: verificar se há categorySplits vinculados; retornar 409. Para cartões/contas: verificar statementImports; retornar 409.

---

## 5. Tabela de transações

- Header `<thead>`: `bg-zinc-50 text-xs font-semibold text-zinc-500 uppercase tracking-wide`
- Linhas `<tr>`: `hover:bg-zinc-50 transition-colors`
- Select de categoria: `border border-zinc-300 rounded px-2 py-1 text-sm bg-white w-48`
- Estado vazio: parágrafo centralizado "Nenhum lançamento sem categoria" quando array vazio

---

## 6. Sidebar — link ativo

Usar `usePathname()` do Next.js para detectar rota atual. Link ativo recebe `bg-zinc-200 font-medium text-zinc-900`; links inativos mantêm `text-zinc-600 hover:bg-zinc-100`.

O layout `(dashboard)/layout.tsx` precisa virar `"use client"` para usar `usePathname`.

---

## 7. Login

- Card centralizado: `max-w-sm mx-auto mt-24 p-8 border border-zinc-200 rounded-xl shadow-sm bg-white`
- Título "Controle Financeiro" acima do form
- Campos com label + mesmo padrão de input do item 3
- Botão submit com `w-full`

---

## Fora do escopo

- Dark mode
- Animações/transições além de `hover:` e `transition-colors`
- Redesign de relatórios/investimentos além de melhorias de botões
- Edição de cadastros (só delete)
