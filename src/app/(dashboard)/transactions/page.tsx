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
