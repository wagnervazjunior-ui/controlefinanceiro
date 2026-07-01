"use client";

import { useEffect, useState } from "react";

interface Person { id: number; name: string; isMain: boolean; }
interface Card { id: number; name: string; lastFourDigits: string | null; bank: string; }
interface BankAccount { id: number; name: string; bank: string; }
interface Category { id: number; name: string; bankTagAlias: string | null; }
interface StatementImport {
  id: number; type: string; fileName: string; importedAt: string;
  cardName: string | null; accountName: string | null;
  year: number | null; month: number | null; txCount: number;
}

type Tab = "pessoas" | "cartoes" | "contas" | "categorias" | "importacoes";
const TAB_LABELS: Record<Tab, string> = {
  pessoas: "Pessoas", cartoes: "Cartões", contas: "Contas", categorias: "Categorias", importacoes: "Importações",
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

  const [imports, setImports] = useState<StatementImport[]>([]);
  const [selectedImports, setSelectedImports] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // confirmDelete[tab] = id being confirmed, or null
  const [confirmDelete, setConfirmDelete] = useState<Record<Tab, number | null>>({
    pessoas: null, cartoes: null, contas: null, categorias: null, importacoes: null,
  });
  const [deleteError, setDeleteError] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/people").then((r) => r.json()).then(setPeople).catch(console.error);
    fetch("/api/cards").then((r) => r.json()).then(setCards).catch(console.error);
    fetch("/api/bank-accounts").then((r) => r.json()).then(setBankAccounts).catch(console.error);
    fetch("/api/statement-imports").then((r) => r.json()).then(setImports).catch(console.error);
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

  async function setMainPerson(id: number) {
    await fetch(`/api/people/${id}/set-main`, { method: "POST" });
    setPeople((prev) => prev.map((p) => ({ ...p, isMain: p.id === id })));
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    setPersonError(null);
    try {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: personName }),
      });
      const body = await response.json();
      if (!response.ok) { setPersonError(body?.error ?? "Erro ao adicionar pessoa."); return; }
      setPeople((prev) => [...prev, body]);
      setPersonName("");
    } catch {
      setPersonError("Erro ao adicionar pessoa.");
    }
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    setCardError(null);
    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cardName, lastFourDigits: cardLastFour, bank: cardBank }),
      });
      const body = await response.json();
      if (!response.ok) { setCardError(body?.error ?? "Erro ao adicionar cartão."); return; }
      setCards((prev) => [...prev, body]);
      setCardName(""); setCardLastFour(""); setCardBank("");
    } catch {
      setCardError("Erro ao adicionar cartão.");
    }
  }

  async function addBankAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    try {
      const response = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: accountName, bank: accountBank }),
      });
      const body = await response.json();
      if (!response.ok) { setAccountError(body?.error ?? "Erro ao adicionar conta."); return; }
      setBankAccounts((prev) => [...prev, body]);
      setAccountName(""); setAccountBank("");
    } catch {
      setAccountError("Erro ao adicionar conta.");
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError(null);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName, bankTagAlias: categoryTag || null }),
      });
      const body = await response.json();
      if (!response.ok) { setCategoryError(body?.error ?? "Erro ao adicionar categoria."); return; }
      setCategories((prev) => [...prev, body]);
      setCategoryName(""); setCategoryTag("");
    } catch {
      setCategoryError("Erro ao adicionar categoria.");
    }
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
    try {
      const response = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      if (response.status === 204) {
        if (tab === "pessoas") setPeople((prev) => prev.filter((x) => x.id !== id));
        if (tab === "cartoes") setCards((prev) => prev.filter((x) => x.id !== id));
        if (tab === "contas") setBankAccounts((prev) => prev.filter((x) => x.id !== id));
        if (tab === "categorias") setCategories((prev) => prev.filter((x) => x.id !== id));
        if (tab === "importacoes") setImports((prev) => prev.filter((x) => x.id !== id));
        setConfirmDelete((prev) => ({ ...prev, [tab]: null }));
      } else {
        const body = await response.json().catch(() => ({}));
        setDeleteError((prev) => ({ ...prev, [id]: body.error ?? "Erro ao excluir." }));
        setConfirmDelete((prev) => ({ ...prev, [tab]: null }));
      }
    } catch {
      setDeleteError((prev) => ({ ...prev, [id]: "Erro de conexão." }));
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
        {(["pessoas", "cartoes", "contas", "categorias", "importacoes"] as Tab[]).map((t) => (
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-800">{p.name}</span>
                  {p.isMain && (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">Principal</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!p.isMain && (
                    <button onClick={() => setMainPerson(p.id)} className={btnSecondary}>
                      Definir como principal
                    </button>
                  )}
                  <DeleteControls tab="pessoas" id={p.id} endpoint="/api/people" />
                </div>
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

      {tab === "importacoes" && (
        <div className="flex flex-col gap-3">
          {imports.length > 0 && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedImports.size === imports.length}
                  onChange={(e) => setSelectedImports(e.target.checked ? new Set(imports.map((i) => i.id)) : new Set())}
                />
                Selecionar todos ({imports.length})
              </label>
              {selectedImports.size > 0 && (
                confirmBulkDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Excluir {selectedImports.size} importação(ões) e todos os lançamentos?</span>
                    <button
                      disabled={bulkDeleting}
                      onClick={async () => {
                        setBulkDeleting(true);
                        await fetch("/api/statement-imports/bulk-delete", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ids: Array.from(selectedImports) }),
                        });
                        setImports((prev) => prev.filter((i) => !selectedImports.has(i.id)));
                        setSelectedImports(new Set());
                        setConfirmBulkDelete(false);
                        setBulkDeleting(false);
                      }}
                      className={btnDestructive}
                    >
                      {bulkDeleting ? "Excluindo..." : "Confirmar"}
                    </button>
                    <button onClick={() => setConfirmBulkDelete(false)} className={btnSecondary}>Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmBulkDelete(true)} className={btnDestructive}>
                    Excluir selecionados ({selectedImports.size})
                  </button>
                )
              )}
            </div>
          )}
          {imports.length === 0 && <p className="text-sm text-zinc-400">Nenhuma importação encontrada.</p>}
          {imports.map((imp) => {
            const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
            const source = imp.cardName ?? imp.accountName ?? "—";
            const period = imp.year && imp.month ? `${MONTHS[imp.month - 1]}/${imp.year}` : "";
            const label = `${imp.type === "fatura" ? "Fatura" : "Extrato"} · ${source}${period ? ` · ${period}` : ""} · ${imp.txCount} lançamento(s)`;
            return (
              <div key={imp.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${selectedImports.has(imp.id) ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 bg-white"}`}>
                <input
                  type="checkbox"
                  checked={selectedImports.has(imp.id)}
                  onChange={(e) => {
                    const next = new Set(selectedImports);
                    e.target.checked ? next.add(imp.id) : next.delete(imp.id);
                    setSelectedImports(next);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800">{label}</p>
                  <p className="text-xs text-zinc-400">{imp.fileName} · importado em {new Date(imp.importedAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <DeleteControls tab="importacoes" id={imp.id} endpoint="/api/statement-imports" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
