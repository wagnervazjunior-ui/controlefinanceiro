import { parseBrazilianAmount } from "../money";
import type { ParsedTransaction } from "./types";

// pdf-parse 1.x concatenates date+description+amount without spaces
const LINE_RE = /^(\d{2})\/(\d{2})\/(\d{4})(.+?)(-?\d[\d.]*,\d{2})$/;

export function parseExtratoText(
  text: string,
  referenceYear: number,
  referenceMonth: number
): ParsedTransaction[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];

  for (const line of lines) {
    if (line.includes("SALDO DO DIA")) continue;
    const match = line.match(LINE_RE);
    if (!match) continue;

    const [, day, month, year, description, amountRaw] = match;
    if (Number(year) !== referenceYear || Number(month) !== referenceMonth) {
      continue;
    }

    results.push({
      date: `${year}-${month}-${day}`,
      description: description.trim(),
      amount: parseBrazilianAmount(amountRaw),
    });
  }

  return results;
}
