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

  useEffect(() => {
    fetch("/api/people").then((r) => r.json()).then(setPeople);
    fetch("/api/cards").then((r) => r.json()).then(setCards);
    fetch("/api/bank-accounts").then((r) => r.json()).then(setBankAccounts);
  }, []);

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: personName }),
    });
    const created = await response.json();
    setPeople((prev) => [...prev, created]);
    setPersonName("");
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cardName, lastFourDigits: cardLastFour, bank: cardBank }),
    });
    const created = await response.json();
    setCards((prev) => [...prev, created]);
    setCardName("");
    setCardLastFour("");
    setCardBank("");
  }

  async function addBankAccount(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: accountName, bank: accountBank }),
    });
    const created = await response.json();
    setBankAccounts((prev) => [...prev, created]);
    setAccountName("");
    setAccountBank("");
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
        <p className="text-sm text-zinc-500">Carregando categorias...</p>
      )}
    </div>
  );
}
