"use client";

import { useEffect, useState } from "react";

interface Month { id: number; year: number; month: number; }
interface Settlement {
  personId: number;
  personName: string;
  owed: number;
  paid: number;
  confirmed: boolean;
  difference: number;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function AcertoPage() {
  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>("");
  const [rows, setRows] = useState<Settlement[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/months")
      .then((r) => r.json())
      .then((data: Month[]) => {
        const sorted = [...data].sort((a, b) => b.year - a.year || b.month - a.month);
        setMonths(sorted);
        if (sorted.length === 0) return;
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = sorted.find((m) => m.year === prev.getFullYear() && m.month === prev.getMonth() + 1);
        setSelectedMonthId(String((prevMonth ?? sorted[0]).id));
      });
  }, []);

  function load() {
    if (!selectedMonthId) return;
    fetch(`/api/settlements?monthId=${selectedMonthId}`)
      .then((r) => r.json())
      .then((data: Settlement[]) => {
        setRows(data);
        setDrafts(Object.fromEntries(data.map((r) => [r.personId, String(r.paid || r.owed)])));
      });
  }

  useEffect(load, [selectedMonthId]);

  async function saveSettlement(personId: number, confirmed: boolean, paidAmount: number) {
    setSavingId(personId);
    await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, monthId: Number(selectedMonthId), paidAmount, confirmed }),
    });
    setSavingId(null);
    load();
  }

  return (
    <div className="p-8 max-w-4xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-700">Período</label>
        <select
          value={selectedMonthId}
          onChange={(e) => setSelectedMonthId(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        >
          {months.map((m) => (
            <option key={m.id} value={m.id}>{MONTH_NAMES[m.month - 1]}/{m.year}</option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">Nenhuma pessoa para acertar neste período. (Cadastre pessoas não-principais e categorize lançamentos.)</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => {
            const draftPaid = Number(drafts[row.personId] ?? row.owed);
            const draftDiff = Math.max(row.owed - draftPaid, 0);
            return (
              <div key={row.personId} className="rounded-lg border border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-zinc-900">{row.personName}</h3>
                  {row.confirmed ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Acertado{row.difference > 0 ? " (parcial)" : ""}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pendente</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-zinc-400">Deve (total)</p>
                    <p className="text-lg font-semibold text-zinc-900">{fmt(row.owed)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Valor recebido</p>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={drafts[row.personId] ?? ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [row.personId]: e.target.value }))}
                      className="mt-0.5 w-32 rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Diferença → despesa principal</p>
                    <p className={`text-lg font-semibold ${draftDiff > 0 ? "text-red-600" : "text-emerald-700"}`}>{fmt(draftDiff)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={savingId === row.personId}
                    onClick={() => saveSettlement(row.personId, true, row.owed)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    Acerto total ({fmt(row.owed)})
                  </button>
                  <button
                    disabled={savingId === row.personId}
                    onClick={() => saveSettlement(row.personId, true, draftPaid)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                  >
                    Confirmar valor recebido
                  </button>
                  {row.confirmed && (
                    <button
                      disabled={savingId === row.personId}
                      onClick={() => saveSettlement(row.personId, false, 0)}
                      className="ml-auto text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
