"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

interface ImportResult {
  created: number;
  skipped: number;
}

export default function ImportPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [faturaFile, setFaturaFile] = useState<File | null>(null);
  const [faturaCardId, setFaturaCardId] = useState("");
  const [faturaYear, setFaturaYear] = useState(new Date().getFullYear().toString());
  const [faturaResult, setFaturaResult] = useState<ImportResult | null>(null);

  const [extratoFile, setExtratoFile] = useState<File | null>(null);
  const [extratoAccountId, setExtratoAccountId] = useState("");
  const [extratoYear, setExtratoYear] = useState(new Date().getFullYear().toString());
  const [extratoMonth, setExtratoMonth] = useState((new Date().getMonth() + 1).toString());
  const [extratoResult, setExtratoResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    fetch("/api/cards").then((r) => r.json()).then(setCards);
    fetch("/api/bank-accounts").then((r) => r.json()).then(setBankAccounts);
  }, []);

  async function submitFatura(e: React.FormEvent) {
    e.preventDefault();
    if (!faturaFile || !faturaCardId) return;
    const formData = new FormData();
    formData.append("file", faturaFile);
    formData.append("cardId", faturaCardId);
    formData.append("referenceYear", faturaYear);
    const response = await fetch("/api/statement-imports/fatura", { method: "POST", body: formData });
    setFaturaResult(await response.json());
  }

  async function submitExtrato(e: React.FormEvent) {
    e.preventDefault();
    if (!extratoFile || !extratoAccountId) return;
    const formData = new FormData();
    formData.append("file", extratoFile);
    formData.append("bankAccountId", extratoAccountId);
    formData.append("referenceYear", extratoYear);
    formData.append("referenceMonth", extratoMonth);
    const response = await fetch("/api/statement-imports/extrato", { method: "POST", body: formData });
    setExtratoResult(await response.json());
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Importar fatura de cartão</h2>
        <form onSubmit={submitFatura} className="flex flex-col gap-2 max-w-sm">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFaturaFile(e.target.files?.[0] ?? null)}
            required
          />
          <select value={faturaCardId} onChange={(e) => setFaturaCardId(e.target.value)} required>
            <option value="" disabled>
              Selecione o cartão
            </option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.lastFourDigits})
              </option>
            ))}
          </select>
          <input
            type="number"
            value={faturaYear}
            onChange={(e) => setFaturaYear(e.target.value)}
            placeholder="Ano"
            required
          />
          <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
            Importar fatura
          </button>
        </form>
        {faturaResult && (
          <p className="mt-2 text-sm">
            {faturaResult.created} lançamento(s) criado(s), {faturaResult.skipped} ignorado(s) (duplicado).{" "}
            <Link href="/transactions" className="underline">
              Ir para categorização
            </Link>
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Importar extrato bancário</h2>
        <form onSubmit={submitExtrato} className="flex flex-col gap-2 max-w-sm">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setExtratoFile(e.target.files?.[0] ?? null)}
            required
          />
          <select value={extratoAccountId} onChange={(e) => setExtratoAccountId(e.target.value)} required>
            <option value="" disabled>
              Selecione a conta
            </option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.bank})
              </option>
            ))}
          </select>
          <input
            type="number"
            value={extratoYear}
            onChange={(e) => setExtratoYear(e.target.value)}
            placeholder="Ano"
            required
          />
          <input
            type="number"
            min={1}
            max={12}
            value={extratoMonth}
            onChange={(e) => setExtratoMonth(e.target.value)}
            placeholder="Mês (1-12)"
            required
          />
          <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
            Importar extrato
          </button>
        </form>
        {extratoResult && (
          <p className="mt-2 text-sm">
            {extratoResult.created} lançamento(s) criado(s), {extratoResult.skipped} ignorado(s) (duplicado).{" "}
            <Link href="/transactions" className="underline">
              Ir para categorização
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
