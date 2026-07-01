"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface CategoryTotal {
  categoryId: number | null;
  categoryName: string | null;
  total: string;
}

interface PersonTotal {
  personId: number;
  personName: string;
  total: number;
  isMain: boolean;
}

interface Month {
  id: number;
  year: number;
  month: number;
  status: string;
}

const COLORS = ["#18181b", "#52525b", "#a1a1aa", "#3f3f46", "#71717a", "#d4d4d8", "#27272a", "#e4e4e7"];

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(value));
}

export default function ReportsPage() {
  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>("");
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [personTotals, setPersonTotals] = useState<PersonTotal[]>([]);

  useEffect(() => {
    fetch("/api/months")
      .then((r) => r.json())
      .then((data: Month[]) => {
        const sorted = [...data].sort((a, b) => b.year - a.year || b.month - a.month);
        setMonths(sorted);
        if (sorted.length === 0) return;
        // Default to the previous calendar month (e.g. in July, close June),
        // falling back to the most recent month with data.
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = sorted.find(
          (m) => m.year === prev.getFullYear() && m.month === prev.getMonth() + 1
        );
        setSelectedMonthId(String((prevMonth ?? sorted[0]).id));
      });
  }, []);

  useEffect(() => {
    const qs = selectedMonthId ? `?monthId=${selectedMonthId}` : "";
    fetch(`/api/reports/category-totals${qs}`).then((r) => r.json()).then(setCategoryTotals);
    fetch(`/api/reports/person-totals${qs}`).then((r) => r.json()).then(setPersonTotals);
  }, [selectedMonthId]);

  // In credit-card faturas, purchases are stored as positive amounts, so an
  // expense is a positive total (refunds/credits are negative).
  const expenses = categoryTotals.filter((c) => Number(c.total) > 0);
  // Group into the top slices + "Outros" so the pie stays readable with many
  // categories.
  const TOP_N = 7;
  const sortedExpenses = [...expenses]
    .map((c) => ({ name: c.categoryName ?? "Sem categoria", value: Math.abs(Number(c.total)) }))
    .sort((a, b) => b.value - a.value);
  const chartData =
    sortedExpenses.length > TOP_N + 1
      ? [
          ...sortedExpenses.slice(0, TOP_N),
          { name: "Outros", value: sortedExpenses.slice(TOP_N).reduce((s, c) => s + c.value, 0) },
        ]
      : sortedExpenses;

  const personBarData = personTotals
    .filter((p) => p.total > 0)
    .map((p) => ({ name: p.personName, value: Math.abs(p.total) }));

  const totalExpenses = expenses.reduce((sum, c) => sum + Math.abs(Number(c.total)), 0);

  return (
    <div className="p-8 max-w-4xl flex flex-col gap-8">
      {/* Month selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-zinc-700">Período</label>
        <select
          value={selectedMonthId}
          onChange={(e) => setSelectedMonthId(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        >
          <option value="">Todos os meses</option>
          {months.map((m) => (
            <option key={m.id} value={m.id}>
              {MONTH_NAMES[m.month - 1]}/{m.year}
            </option>
          ))}
        </select>
        <a
          href={`/api/reports/export${selectedMonthId ? `?monthId=${selectedMonthId}` : ""}`}
          className="ml-auto rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Exportar Excel
        </a>
      </div>

      {/* Per-person cards */}
      {personTotals.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Por pessoa</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {personTotals
              .filter((p) => p.total > 0)
              .sort((a, b) => b.total - a.total)
              .map((p) => (
                <div key={p.personId} className="rounded-lg border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-zinc-500">{p.personName}</span>
                    {p.isMain && (
                      <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">principal</span>
                    )}
                  </div>
                  <p className="text-xl font-semibold text-zinc-900">{fmt(p.total)}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {totalExpenses > 0 ? ((Math.abs(p.total) / totalExpenses) * 100).toFixed(0) : 0}% do total
                  </p>
                </div>
              ))}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-medium text-zinc-400 mb-1">Total geral</p>
              <p className="text-xl font-semibold text-zinc-900">{fmt(totalExpenses)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Category pie chart */}
      {chartData.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Por categoria</h2>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={true}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Per-person bar chart */}
      {personBarData.length > 1 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Comparativo por pessoa</h2>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={personBarData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="value" fill="#18181b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Category breakdown table */}
      {expenses.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Detalhamento por categoria</h2>
          <div className="rounded-lg border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Categoria</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">% do total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {[...expenses]
                  .sort((a, b) => Number(a.total) - Number(b.total))
                  .map((c, i) => (
                    <tr key={i} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-zinc-800">{c.categoryName ?? <span className="text-zinc-400">Sem categoria</span>}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-800">{fmt(Number(c.total))}</td>
                      <td className="px-4 py-3 text-right text-zinc-500">
                        {totalExpenses > 0 ? ((Math.abs(Number(c.total)) / totalExpenses) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {chartData.length === 0 && personTotals.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">Nenhum dado para exibir. Importe e categorize transações primeiro.</p>
        </div>
      )}
    </div>
  );
}
