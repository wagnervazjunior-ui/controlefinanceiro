"use client";

import { useEffect, useState } from "react";

interface Person { id: number; name: string; isMain: boolean; }
interface Income {
  id: number;
  personId: number;
  personName: string | null;
  monthId: number;
  description: string;
  amount: string;
  date: string;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const inputClass = "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";
const labelClass = "text-sm font-medium text-zinc-700";
const btnPrimary = "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function ReceitasPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  const now = new Date();
  const [personId, setPersonId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  function loadIncomes() {
    fetch("/api/incomes").then((r) => r.json()).then(setIncomes).catch(console.error);
  }

  useEffect(() => {
    fetch("/api/people")
      .then((r) => r.json())
      .then((data: Person[]) => {
        setPeople(data);
        const main = data.find((p) => p.isMain);
        if (main) setPersonId(String(main.id));
        else if (data[0]) setPersonId(String(data[0].id));
      })
      .catch(console.error);
    loadIncomes();
  }, []);

  async function addIncome(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const response = await fetch("/api/incomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: Number(personId),
        description,
        amount: Number(amount),
        referenceYear: Number(year),
        referenceMonth: Number(month),
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Erro ao adicionar receita.");
      return;
    }
    setDescription("");
    setAmount("");
    loadIncomes();
  }

  async function deleteIncome(id: number) {
    await fetch(`/api/incomes/${id}`, { method: "DELETE" });
    setIncomes((prev) => prev.filter((i) => i.id !== id));
    setConfirmDelete(null);
  }

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="p-8 max-w-3xl flex flex-col gap-8">
      <section>
        <h2 className="mb-5 text-base font-semibold text-zinc-900">Adicionar receita</h2>
        <form onSubmit={addIncome} className="flex flex-col gap-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-40">
              <label className={labelClass}>Pessoa</label>
              <select value={personId} onChange={(e) => setPersonId(e.target.value)} required className={inputClass}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.isMain ? " (principal)" : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-28">
              <label className={labelClass}>Ano</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1 w-28">
              <label className={labelClass}>Mês (1–12)</label>
              <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} required className={inputClass} />
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-48">
              <label className={labelClass}>Descrição</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} required className={inputClass} placeholder="Salário, freela, etc." />
            </div>
            <div className="flex flex-col gap-1 w-40">
              <label className={labelClass}>Valor (R$)</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className={inputClass} />
            </div>
          </div>
          <button type="submit" className={btnPrimary + " self-start"}>Adicionar receita</button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Receitas cadastradas</h2>
          <span className="text-sm font-medium text-zinc-700">Total: {fmt(total)}</span>
        </div>
        {incomes.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-zinc-400">Nenhuma receita cadastrada.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Mês</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Pessoa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Descrição</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {incomes.map((inc) => {
                  const [y, m] = inc.date.split("-");
                  return (
                    <tr key={inc.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{MONTH_NAMES[Number(m) - 1]}/{y}</td>
                      <td className="px-4 py-3 text-zinc-700">{inc.personName ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-800">{inc.description}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">{fmt(Number(inc.amount))}</td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        {confirmDelete === inc.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => deleteIncome(inc.id)} className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Confirmar</button>
                            <button onClick={() => setConfirmDelete(null)} className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-50">Cancelar</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDelete(inc.id)} className="text-zinc-300 hover:text-red-400 text-xs" title="Excluir">✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
