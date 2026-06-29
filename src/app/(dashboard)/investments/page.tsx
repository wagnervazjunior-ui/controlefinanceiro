"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Investment {
  id: number;
  assetType: string;
  currentBalance: string;
  date: string;
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [form, setForm] = useState({ assetType: "", currentBalance: "", date: "" });

  useEffect(() => {
    fetch("/api/investments").then((r) => r.json()).then(setInvestments);
  }, []);

  async function addInvestment() {
    const response = await fetch("/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetType: form.assetType,
        currentBalance: Number(form.currentBalance),
        date: form.date,
      }),
    });
    const created = await response.json();
    setInvestments((prev) => [...prev, created]);
    setForm({ assetType: "", currentBalance: "", date: "" });
  }

  const evolutionData = [...investments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((inv) => ({ date: inv.date, balance: Number(inv.currentBalance) }));

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Investimentos</h1>
      <div className="flex gap-2 mb-6">
        <input
          placeholder="Tipo de ativo"
          value={form.assetType}
          onChange={(e) => setForm({ ...form, assetType: e.target.value })}
        />
        <input
          placeholder="Saldo atual"
          type="number"
          value={form.currentBalance}
          onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <button onClick={addInvestment}>Adicionar</button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={evolutionData}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="balance" stroke="#2563eb" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
