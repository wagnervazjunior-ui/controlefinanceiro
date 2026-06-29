function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function suggestCategoryId(
  bankSuggestedTag: string | null,
  categories: { id: number; bankTagAlias: string | null }[]
): number | null {
  if (!bankSuggestedTag) return null;
  const normalizedTag = stripAccents(bankSuggestedTag.toLowerCase());
  const match = categories.find(
    (c) => c.bankTagAlias && stripAccents(c.bankTagAlias.toLowerCase()) === normalizedTag
  );
  return match?.id ?? null;
}
