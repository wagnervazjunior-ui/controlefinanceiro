export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  installmentCurrent?: number;
  installmentTotal?: number;
  bankSuggestedTag?: string;
}

export interface BankParser {
  parseFaturaText(text: string, referenceYear: number): ParsedTransaction[];
  parseExtratoText(
    text: string,
    referenceYear: number,
    referenceMonth: number
  ): ParsedTransaction[];
}
