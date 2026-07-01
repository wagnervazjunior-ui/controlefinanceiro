import { parseBrazilianAmount } from "../money";
import type { ParsedTransaction } from "./types";

const COMPRAS_SECTION_RE =
  /Lançamentos: compras e saques([\s\S]*?)(?=\n\s*Lançamentos(?::| internacionais)|$)/;
const PRODUTOS_SECTION_RE =
  /Lançamentos: produtos e serviços([\s\S]*?)(?=\n\s*Lançamentos(?::| internacionais)|$)/;
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

  return transactions;
}
