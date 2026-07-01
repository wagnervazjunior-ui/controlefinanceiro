import { parseBrazilianAmount } from "../money";
import type { ParsedTransaction } from "./types";

const COMPRAS_SECTION_RE =
  /Lançamentos: compras e saques([\s\S]*?)(?=\n\s*Lançamentos: produtos e serviços|\n\s*Lançamentos internacionais|$)/;
const PRODUTOS_SECTION_RE =
  /Lançamentos: produtos e serviços([\s\S]*?)(?=\n\s*Lançamentos|$)/;
const INTERNACIONAIS_SECTION_RE =
  /Lançamentos internacionais([\s\S]*?)(?=\n\s*Lançamentos:|$)/;

// pdf-parse 1.x concatenates date+description+amount without spaces
const TX_WITH_INSTALLMENT_RE =
  /^(\d{2})\/(\d{2})\s*(.+?)\s*(\d{2})\/(\d{2})\s*(-?[\d.]+,\d{2})$/;
const TX_PLAIN_RE = /^(\d{2})\/(\d{2})\s*(.+?)\s*(-?[\d.]+,\d{2})$/;
const TAG_LINE_RE = /^(\S+)\s+(.+)$/;

function toIsoDate(day: string, month: string, referenceYear: number, referenceMonth: number): string {
  const txMonth = Number(month);
  // If transaction month is later in the year than the closing month, it belongs
  // to the previous year (e.g. Dec transactions on a Jan fatura → year - 1)
  const year = txMonth > referenceMonth ? referenceYear - 1 : referenceYear;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseSection(
  body: string,
  referenceYear: number,
  referenceMonth: number,
  expectTagLine: boolean
): ParsedTransaction[] {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const results: ParsedTransaction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const withInstallment = line.match(TX_WITH_INSTALLMENT_RE);
    const plain = !withInstallment ? line.match(TX_PLAIN_RE) : null;
    const match = withInstallment ?? plain;
    if (!match) continue;

    let day: string, month: string, description: string, amountRaw: string;
    let installmentCurrent: number | undefined;
    let installmentTotal: number | undefined;

    if (withInstallment) {
      [, day, month, description, , , amountRaw] = withInstallment;
      installmentCurrent = Number(withInstallment[4]);
      installmentTotal = Number(withInstallment[5]);
    } else {
      [, day, month, description, amountRaw] = plain!;
    }

    let bankSuggestedTag: string | undefined;
    if (expectTagLine) {
      const nextLine = lines[i + 1];
      const tagMatch = nextLine?.match(TAG_LINE_RE);
      if (tagMatch && !tagMatch[1].match(/^\d/)) {
        bankSuggestedTag = tagMatch[1].toLowerCase();
        i++; // consume the tag line
      }
    }

    results.push({
      date: toIsoDate(day, month, referenceYear, referenceMonth),
      description: description.trim(),
      amount: parseBrazilianAmount(amountRaw),
      installmentCurrent,
      installmentTotal,
      bankSuggestedTag,
    });
  }

  return results;
}

// Fallback for consolidated / two-column faturas whose section headers get
// concatenated without spaces (e.g. "Lançamentos:comprase saques"), which the
// section-based parser above cannot locate. Here we scan every line for the
// transaction pattern instead of relying on section boundaries.
const FALLBACK_TX_RE =
  /^(\d{2})\/(\d{2})(.+?)(?:(\d{2})\/(\d{2}))?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})$/;
const IOF_REPASSE_RE = /Repasse\s*de IOF em R\$\s*([\d.]+,\d{2})/;

function parseFaturaFallback(
  text: string,
  referenceYear: number,
  referenceMonth: number
): ParsedTransaction[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const results: ParsedTransaction[] = [];
  // Track installment purchases already seen so the "Compras parceladas -
  // próximas faturas" preview (same description + total, higher counter,
  // appearing later in the document) is dropped instead of imported.
  const seenInstallments = new Set<string>();

  for (const line of lines) {
    const match = line.match(FALLBACK_TX_RE);
    if (!match) continue;
    const [, day, month, descRaw, instCur, instTot, amountRaw] = match;
    const description = descRaw.trim();
    if (!description) continue;

    const installmentCurrent = instCur ? Number(instCur) : undefined;
    const installmentTotal = instTot ? Number(instTot) : undefined;

    if (installmentTotal != null) {
      const key = `${description}|${installmentTotal}`;
      if (seenInstallments.has(key)) continue;
      seenInstallments.add(key);
    }

    results.push({
      date: toIsoDate(day, month, referenceYear, referenceMonth),
      description,
      amount: parseBrazilianAmount(amountRaw.replace(/\s/g, "")),
      installmentCurrent,
      installmentTotal,
      bankSuggestedTag: undefined,
    });
  }

  // The IOF repasse on international purchases is a summary line without a
  // date, so synthesize it as a transaction so the imported total matches the
  // fatura total.
  const iofMatch = text.match(IOF_REPASSE_RE);
  if (iofMatch) {
    results.push({
      date: `${referenceYear}-${String(referenceMonth).padStart(2, "0")}-01`,
      description: "Repasse de IOF",
      amount: parseBrazilianAmount(iofMatch[1]),
      installmentCurrent: undefined,
      installmentTotal: undefined,
      bankSuggestedTag: undefined,
    });
  }

  return results;
}

export function parseFaturaText(
  text: string,
  referenceYear: number,
  referenceMonth: number
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const comprasMatch = text.match(COMPRAS_SECTION_RE);
  if (comprasMatch) {
    transactions.push(...parseSection(comprasMatch[1], referenceYear, referenceMonth, true));
  }

  const produtosMatch = text.match(PRODUTOS_SECTION_RE);
  if (produtosMatch) {
    transactions.push(...parseSection(produtosMatch[1], referenceYear, referenceMonth, false));
  }

  const internacionaisMatch = text.match(INTERNACIONAIS_SECTION_RE);
  if (internacionaisMatch) {
    transactions.push(...parseSection(internacionaisMatch[1], referenceYear, referenceMonth, false));
  }

  // The section-based parser handles the classic single-card layout. If it
  // finds nothing, this is likely a consolidated/two-column fatura — fall back
  // to line scanning.
  if (transactions.length === 0) {
    return parseFaturaFallback(text, referenceYear, referenceMonth);
  }

  return transactions;
}
