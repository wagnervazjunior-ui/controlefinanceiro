function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Bank-statement descriptions for a credit-card bill payment, e.g.
// "PAGAMENTO FATURA", "PAGTO CARTAO", "PAG FATURA CARTAO".
const FATURA_PAYMENT_RE = /pag(amen|to)?\w*.{0,8}(fatura|cartao)|(fatura|cartao).{0,8}pag/;

export function suggestCategoryId(
  bankSuggestedTag: string | null,
  categories: { id: number; bankTagAlias: string | null; excludeFromReports?: boolean }[],
  description?: string | null
): number | null {
  // A card-bill payment appearing in the bank statement should map to the
  // "excluded from reports" category so it isn't double-counted.
  if (description) {
    const normalizedDesc = stripAccents(description.toLowerCase());
    if (FATURA_PAYMENT_RE.test(normalizedDesc)) {
      const excluded = categories.find((c) => c.excludeFromReports);
      if (excluded) return excluded.id;
    }
  }

  if (!bankSuggestedTag) return null;
  const normalizedTag = stripAccents(bankSuggestedTag.toLowerCase());
  const match = categories.find(
    (c) => c.bankTagAlias && stripAccents(c.bankTagAlias.toLowerCase()) === normalizedTag
  );
  return match?.id ?? null;
}
