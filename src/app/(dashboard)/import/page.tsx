"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Card {
  id: number;
  name: string;
  lastFourDigits: string | null;
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

function FileDropzone({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onChange(dropped);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-lg border-2 p-6 text-center transition-colors ${
        file
          ? "border-zinc-400 bg-zinc-50"
          : dragging
          ? "border-zinc-500 bg-zinc-100"
          : "border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
      {file ? (
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate max-w-xs">{file.name}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-zinc-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div>
            <p className="text-sm font-medium text-zinc-600">Clique para selecionar PDF</p>
            <p className="text-xs text-zinc-400">ou arraste o arquivo aqui</p>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none w-full";
const labelClass = "text-sm font-medium text-zinc-700";
const btnPrimary = "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function ImportPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [faturaFile, setFaturaFile] = useState<File | null>(null);
  const [faturaCardId, setFaturaCardId] = useState("");
  const [faturaYear, setFaturaYear] = useState(new Date().getFullYear().toString());
  const [faturaResult, setFaturaResult] = useState<ImportResult | null>(null);
  const [faturaError, setFaturaError] = useState<string | null>(null);
  const [faturaSubmitting, setFaturaSubmitting] = useState(false);

  const [extratoFile, setExtratoFile] = useState<File | null>(null);
  const [extratoAccountId, setExtratoAccountId] = useState("");
  const [extratoYear, setExtratoYear] = useState(new Date().getFullYear().toString());
  const [extratoMonth, setExtratoMonth] = useState((new Date().getMonth() + 1).toString());
  const [extratoResult, setExtratoResult] = useState<ImportResult | null>(null);
  const [extratoError, setExtratoError] = useState<string | null>(null);
  const [extratoSubmitting, setExtratoSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/cards").then((r) => r.json()).then(setCards).catch(console.error);
    fetch("/api/bank-accounts").then((r) => r.json()).then(setBankAccounts).catch(console.error);
  }, []);

  async function submitFatura(e: React.FormEvent) {
    e.preventDefault();
    if (!faturaFile || !faturaCardId) return;
    setFaturaError(null);
    setFaturaResult(null);
    setFaturaSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", faturaFile);
      formData.append("cardId", faturaCardId);
      formData.append("referenceYear", faturaYear);
      const response = await fetch("/api/statement-imports/fatura", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) { setFaturaError(body?.error ?? "Erro ao importar fatura."); return; }
      setFaturaResult(body);
    } catch {
      setFaturaError("Erro ao importar fatura.");
    } finally {
      setFaturaSubmitting(false);
    }
  }

  async function submitExtrato(e: React.FormEvent) {
    e.preventDefault();
    if (!extratoFile || !extratoAccountId) return;
    setExtratoError(null);
    setExtratoResult(null);
    setExtratoSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", extratoFile);
      formData.append("bankAccountId", extratoAccountId);
      formData.append("referenceYear", extratoYear);
      formData.append("referenceMonth", extratoMonth);
      const response = await fetch("/api/statement-imports/extrato", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) { setExtratoError(body?.error ?? "Erro ao importar extrato."); return; }
      setExtratoResult(body);
    } catch {
      setExtratoError("Erro ao importar extrato.");
    } finally {
      setExtratoSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-xl flex flex-col gap-10">
      <section>
        <h2 className="mb-5 text-base font-semibold text-zinc-900">Importar fatura de cartão</h2>
        <form onSubmit={submitFatura} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Arquivo PDF</label>
            <FileDropzone file={faturaFile} onChange={setFaturaFile} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Cartão</label>
            <select value={faturaCardId} onChange={(e) => setFaturaCardId(e.target.value)} required className={inputClass}>
              <option value="" disabled>Selecione o cartão</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.lastFourDigits && ` (${c.lastFourDigits})`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Ano de referência</label>
            <input type="number" value={faturaYear} onChange={(e) => setFaturaYear(e.target.value)} required className={inputClass} />
          </div>
          <button type="submit" disabled={faturaSubmitting} className={btnPrimary}>
            {faturaSubmitting ? "Importando..." : "Importar fatura"}
          </button>
        </form>
        {faturaError && <p className="mt-3 rounded-md bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{faturaError}</p>}
        {faturaResult && (
          <p className="mt-3 rounded-md bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-700">
            {faturaResult.created} lançamento(s) criado(s), {faturaResult.skipped} ignorado(s).{" "}
            <Link href="/transactions" className="font-medium underline">Ir para categorização →</Link>
          </p>
        )}
      </section>

      <div className="border-t border-zinc-200" />

      <section>
        <h2 className="mb-5 text-base font-semibold text-zinc-900">Importar extrato bancário</h2>
        <form onSubmit={submitExtrato} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Arquivo PDF</label>
            <FileDropzone file={extratoFile} onChange={setExtratoFile} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Conta bancária</label>
            <select value={extratoAccountId} onChange={(e) => setExtratoAccountId(e.target.value)} required className={inputClass}>
              <option value="" disabled>Selecione a conta</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.bank})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Ano</label>
              <input type="number" value={extratoYear} onChange={(e) => setExtratoYear(e.target.value)} required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Mês (1–12)</label>
              <input type="number" min={1} max={12} value={extratoMonth} onChange={(e) => setExtratoMonth(e.target.value)} required className={inputClass} />
            </div>
          </div>
          <button type="submit" disabled={extratoSubmitting} className={btnPrimary}>
            {extratoSubmitting ? "Importando..." : "Importar extrato"}
          </button>
        </form>
        {extratoError && <p className="mt-3 rounded-md bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{extratoError}</p>}
        {extratoResult && (
          <p className="mt-3 rounded-md bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-700">
            {extratoResult.created} lançamento(s) criado(s), {extratoResult.skipped} ignorado(s).{" "}
            <Link href="/transactions" className="font-medium underline">Ir para categorização →</Link>
          </p>
        )}
      </section>
    </div>
  );
}
