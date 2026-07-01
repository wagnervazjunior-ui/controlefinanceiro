"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  categoryId: number | null;
  suggestedCategoryId: number | null;
  cardId: number | null;
  bankAccountId: number | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
}

interface Category {
  id: number;
  name: string;
}

interface Card {
  id: number;
  name: string;
  bank: string;
}

interface BankAccount {
  id: number;
  name: string;
  bank: string;
}

const selectClass = "rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none";

export default function TransactionsPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [showAll, setShowAll] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/transactions").then((r) => r.json()).then(setAllTransactions).catch(console.error);
    fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(console.error);
    fetch("/api/cards").then((r) => r.json()).then(setCards).catch(console.error);
    fetch("/api/bank-accounts").then((r) => r.json()).then(setBankAccounts).catch(console.error);
  }, []);

  async function categorize(transactionId: number, categoryId: number) {
    await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    setAllTransactions((prev) =>
      prev.map((t) => t.id === transactionId ? { ...t, categoryId } : t)
    );
  }

  function sourceName(tx: Transaction) {
    if (tx.cardId) {
      const card = cards.find((c) => c.id === tx.cardId);
      return card ? card.name : "Cartão";
    }
    if (tx.bankAccountId) {
      const acc = bankAccounts.find((a) => a.id === tx.bankAccountId);
      return acc ? acc.name : "Conta";
    }
    return "—";
  }

  const transactions = allTransactions.filter((tx) => {
    if (!showAll && tx.categoryId !== null) return false;
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (sourceFilter === "all") return true;
    if (sourceFilter.startsWith("card:")) return tx.cardId === Number(sourceFilter.slice(5));
    if (sourceFilter.startsWith("account:")) return tx.bankAccountId === Number(sourceFilter.slice(8));
    return true;
  });

  const uncategorizedCount = allTransactions.filter((tx) => tx.categoryId === null).length;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1">
          <button
            onClick={() => setShowAll(false)}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${!showAll ? "bg-zinc-900 text-white font-medium" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            Sem categoria
            {uncategorizedCount > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${!showAll ? "bg-white text-zinc-900" : "bg-zinc-200 text-zinc-600"}`}>
                {uncategorizedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${showAll ? "bg-zinc-900 text-white font-medium" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            Todos
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none w-56"
        />

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">Todas as origens</option>
          {cards.length > 0 && <optgroup label="Cartões">
            {cards.map((c) => (
              <option key={`card:${c.id}`} value={`card:${c.id}`}>{c.name}</option>
            ))}
          </optgroup>}
          {bankAccounts.length > 0 && <optgroup label="Contas bancárias">
            {bankAccounts.map((a) => (
              <option key={`account:${a.id}`} value={`account:${a.id}`}>{a.name}</option>
            ))}
          </optgroup>}
        </select>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">
            {showAll ? "Nenhum lançamento encontrado." : "Nenhum lançamento sem categoria."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Origem</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Descrição</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Categoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">{sourceName(tx)}</td>
                  <td className="px-4 py-3 text-zinc-800">
                    {tx.description}
                    {tx.installmentCurrent && tx.installmentTotal && (
                      <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500">
                        {tx.installmentCurrent}/{tx.installmentTotal}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${Number(tx.amount) < 0 ? "text-red-600" : "text-zinc-800"}`}>
                    {Number(tx.amount) < 0 ? `-R$ ${Math.abs(Number(tx.amount)).toFixed(2).replace(".", ",")}` : `R$ ${Number(tx.amount).toFixed(2).replace(".", ",")}`}
                  </td>
                  <td className="px-4 py-3">
                    {showAll && tx.categoryId !== null ? (
                      <select
                        value={tx.categoryId}
                        onChange={(e) => categorize(tx.id, Number(e.target.value))}
                        className={`${selectClass} w-44`}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        defaultValue={tx.suggestedCategoryId ?? ""}
                        onChange={(e) => categorize(tx.id, Number(e.target.value))}
                        className={`${selectClass} w-44`}
                      >
                        <option value="" disabled>Selecione</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
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
