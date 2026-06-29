"use client";

import { useEffect, useState } from "react";

interface Person {
  id: number;
  name: string;
}

interface Card {
  id: number;
  name: string;
  lastFourDigits: string;
  bank: string;
}

interface BankAccount {
  id: number;
  name: string;
  bank: string;
}

interface Category {
  id: number;
  name: string;
  bankTagAlias: string | null;
}

type Tab = "pessoas" | "cartoes" | "contas" | "categorias";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("pessoas");

  const [people, setPeople] = useState<Person[]>([]);
  const [personName, setPersonName] = useState("");

  const [cards, setCards] = useState<Card[]>([]);
  const [cardName, setCardName] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [cardBank, setCardBank] = useState("");

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accountName, setAccountName] = useState("");
  const [accountBank, setAccountBank] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryTag, setCategoryTag] = useState("");
  const [splitDrafts, setSplitDrafts] = useState<Record<number, Record<number, string>>>({});
  const [splitMessage, setSplitMessage] = useState<Record<number, string>>({});

  const [personError, setPersonError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/people")
      .then((r) => r.json())
      .then(setPeople)
      .catch((err) => console.error("Failed to load people:", err));
    fetch("/api/cards")
      .then((r) => r.json())
      .then(setCards)
      .catch((err) => console.error("Failed to load cards:", err));
    fetch("/api/bank-accounts")
      .then((r) => r.json())
      .then(setBankAccounts)
      .catch((err) => console.error("Failed to load bank accounts:", err));
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

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
      if (!response.ok) {
        setPersonError(body?.error ?? "Erro ao adicionar pessoa.");
        return;
      }
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
      if (!response.ok) {
        setCardError(body?.error ?? "Erro ao adicionar cartão.");
        return;
      }
      setCards((prev) => [...prev, body]);
      setCardName("");
      setCardLastFour("");
      setCardBank("");
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
      if (!response.ok) {
        setAccountError(body?.error ?? "Erro ao adicionar conta.");
        return;
      }
      setBankAccounts((prev) => [...prev, body]);
      setAccountName("");
      setAccountBank("");
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
      if (!response.ok) {
        setCategoryError(body?.error ?? "Erro ao adicionar categoria.");
        return;
      }
      setCategories((prev) => [...prev, body]);
      setCategoryName("");
      setCategoryTag("");
    } catch {
      setCategoryError("Erro ao adicionar categoria.");
    }
  }

  function updateSplitDraft(categoryId: number, personId: number, value: string) {
    setSplitDrafts((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], [personId]: value },
    }));
  }

  async function saveSplits(categoryId: number) {
    const draft = splitDrafts[categoryId] ?? {};
    const splits = people.map((p) => ({
      personId: p.id,
      percentage: Number(draft[p.id] ?? 0),
    }));
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

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-2 border-b">
        {(["pessoas", "cartoes", "contas", "categorias"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-zinc-900 font-medium" : "text-zinc-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "pessoas" && (
        <div>
          <form onSubmit={addPerson} className="mb-4 flex gap-2 max-w-sm">
            <input
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Nome"
              className="flex-1 rounded border px-3 py-2 text-sm"
              required
            />
            <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">
              Adicionar
            </button>
          </form>
          {personError && <p className="mb-2 text-sm text-red-600">{personError}</p>}
          <ul className="text-sm">
            {people.map((p) => (
              <li key={p.id} className="border-b py-1">
                {p.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "cartoes" && (
        <div>
          <form onSubmit={addCard} className="mb-4 flex gap-2 max-w-md">
            <input
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Nome do cartão"
              className="flex-1 rounded border px-3 py-2 text-sm"
              required
            />
            <input
              value={cardLastFour}
              onChange={(e) => setCardLastFour(e.target.value)}
              placeholder="Últimos 4 dígitos"
              maxLength={4}
              className="w-32 rounded border px-3 py-2 text-sm"
              required
            />
            <input
              value={cardBank}
              onChange={(e) => setCardBank(e.target.value)}
              placeholder="Banco"
              className="w-32 rounded border px-3 py-2 text-sm"
              required
            />
            <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">
              Adicionar
            </button>
          </form>
          {cardError && <p className="mb-2 text-sm text-red-600">{cardError}</p>}
          <ul className="text-sm">
            {cards.map((c) => (
              <li key={c.id} className="border-b py-1">
                {c.name} •••• {c.lastFourDigits} ({c.bank})
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "contas" && (
        <div>
          <form onSubmit={addBankAccount} className="mb-4 flex gap-2 max-w-sm">
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Nome da conta"
              className="flex-1 rounded border px-3 py-2 text-sm"
              required
            />
            <input
              value={accountBank}
              onChange={(e) => setAccountBank(e.target.value)}
              placeholder="Banco"
              className="w-32 rounded border px-3 py-2 text-sm"
              required
            />
            <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">
              Adicionar
            </button>
          </form>
          {accountError && <p className="mb-2 text-sm text-red-600">{accountError}</p>}
          <ul className="text-sm">
            {bankAccounts.map((a) => (
              <li key={a.id} className="border-b py-1">
                {a.name} ({a.bank})
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "categorias" && (
        <div>
          <form onSubmit={addCategory} className="mb-4 flex gap-2 max-w-md">
            <input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nome da categoria"
              className="flex-1 rounded border px-3 py-2 text-sm"
              required
            />
            <input
              value={categoryTag}
              onChange={(e) => setCategoryTag(e.target.value)}
              placeholder="Tag do banco (opcional)"
              className="w-48 rounded border px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">
              Adicionar
            </button>
          </form>
          {categoryError && <p className="mb-2 text-sm text-red-600">{categoryError}</p>}

          <ul className="flex flex-col gap-4 text-sm">
            {categories.map((c) => (
              <li key={c.id} className="rounded border p-3">
                <p className="mb-2 font-medium">
                  {c.name} {c.bankTagAlias && <span className="text-zinc-500">({c.bankTagAlias})</span>}
                </p>
                <p className="mb-2 text-xs text-zinc-500">Divisão por pessoa (% deve somar 100):</p>
                <div className="flex flex-wrap gap-2">
                  {people.map((p) => (
                    <label key={p.id} className="flex items-center gap-1">
                      <span className="text-xs">{p.name}</span>
                      <input
                        type="number"
                        className="w-16 rounded border px-2 py-1 text-xs"
                        value={splitDrafts[c.id]?.[p.id] ?? ""}
                        onChange={(e) => updateSplitDraft(c.id, p.id, e.target.value)}
                      />
                      <span className="text-xs">%</span>
                    </label>
                  ))}
                  <button
                    onClick={() => saveSplits(c.id)}
                    className="rounded bg-zinc-900 px-2 py-1 text-xs text-white"
                  >
                    Salvar splits
                  </button>
                </div>
                {splitMessage[c.id] && <p className="mt-1 text-xs text-zinc-600">{splitMessage[c.id]}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
