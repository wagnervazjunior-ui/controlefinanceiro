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
