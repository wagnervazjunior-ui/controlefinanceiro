import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "../../../../db/client";
import {
  transactions,
  categories,
  categorySplits,
  people,
  cards,
  bankAccounts,
  months,
} from "../../../../db/schema";

export const runtime = "nodejs";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export async function GET(request: NextRequest) {
  const monthId = request.nextUrl.searchParams.get("monthId");

  const [txRows, allCategories, splits, allPeople, allCards, allAccounts, allMonths] =
    await Promise.all([
      monthId
        ? db.select().from(transactions).where(eq(transactions.monthId, Number(monthId)))
        : db.select().from(transactions),
      db.select().from(categories),
      db.select().from(categorySplits),
      db.select().from(people),
      db.select().from(cards),
      db.select().from(bankAccounts),
      db.select().from(months),
    ]);

  const mainPerson = allPeople.find((p) => p.isMain);
  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const cardById = new Map(allCards.map((c) => [c.id, c]));
  const accountById = new Map(allAccounts.map((a) => [a.id, a]));

  // person id -> rows for its sheet
  const perPerson = new Map<number, (string | number)[][]>();
  const totals = new Map<number, number>();
  for (const p of allPeople) {
    perPerson.set(p.id, [["Data", "Origem", "Descrição", "Categoria", "Parcela", "% Pessoa", "Valor total", "Valor da pessoa"]]);
    totals.set(p.id, 0);
  }

  for (const tx of txRows) {
    if (tx.categoryId == null) continue;
    const category = categoryById.get(tx.categoryId);
    if (!category || category.excludeFromReports) continue;

    // Normalize sign so expenses are positive (extrato debits are negative).
    const amount = tx.bankAccountId != null ? -Number(tx.amount) : Number(tx.amount);

    const relevant = splits.filter((s) => s.categoryId === tx.categoryId);
    const distribution =
      relevant.length > 0
        ? relevant.map((s) => ({ personId: s.personId, pct: Number(s.percentage) }))
        : mainPerson
        ? [{ personId: mainPerson.id, pct: 100 }]
        : [];

    const origem = tx.cardId
      ? cardById.get(tx.cardId)?.name ?? "Cartão"
      : tx.bankAccountId
      ? accountById.get(tx.bankAccountId)?.name ?? "Conta"
      : "—";
    const parcela = tx.installmentCurrent && tx.installmentTotal ? `${tx.installmentCurrent}/${tx.installmentTotal}` : "";

    for (const { personId, pct } of distribution) {
      const share = amount * (pct / 100);
      perPerson.get(personId)?.push([
        tx.date,
        origem,
        tx.description,
        category.name,
        parcela,
        pct,
        Number(amount.toFixed(2)),
        Number(share.toFixed(2)),
      ]);
      totals.set(personId, (totals.get(personId) ?? 0) + share);
    }
  }

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summary: (string | number)[][] = [["Pessoa", "Total (R$)"]];
  for (const p of allPeople) summary.push([p.name, Number((totals.get(p.id) ?? 0).toFixed(2))]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Resumo");

  // One sheet per person (only those with rows beyond the header)
  for (const p of allPeople) {
    const rows = perPerson.get(p.id)!;
    if (rows.length <= 1) continue;
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    // sanitize sheet name (Excel forbids some chars, max 31 chars)
    const name = p.name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || `Pessoa ${p.id}`;
    XLSX.utils.book_append_sheet(wb, sheet, name);
  }

  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

  const period = monthId
    ? (() => {
        const m = allMonths.find((x) => x.id === Number(monthId));
        return m ? `${MONTHS[m.month - 1]}-${m.year}` : "periodo";
      })()
    : "todos-os-meses";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="relatorio-${period}.xlsx"`,
    },
  });
}
