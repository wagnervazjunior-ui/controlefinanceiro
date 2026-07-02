import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
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

const HEADER_FILL = "FF18181B"; // zinc-900
const ZEBRA_FILL = "FFF4F4F5"; // zinc-100
const TOTAL_FILL = "FFE4E4E7"; // zinc-200
const CURRENCY_FMT = 'R$ #,##0.00;[Red]-R$ #,##0.00';

interface Row {
  date: string;
  origem: string;
  description: string;
  category: string;
  parcela: string;
  pct: number;
  total: number;
  share: number;
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF52525B" } } };
  });
  row.height = 20;
}

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

  const perPerson = new Map<number, Row[]>();
  const totals = new Map<number, number>();
  for (const p of allPeople) {
    perPerson.set(p.id, []);
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
      perPerson.get(personId)?.push({
        date: tx.date,
        origem,
        description: tx.description,
        category: category.name,
        parcela,
        pct,
        total: Number(amount.toFixed(2)),
        share: Number(share.toFixed(2)),
      });
      totals.set(personId, (totals.get(personId) ?? 0) + share);
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Controle Financeiro";
  wb.created = new Date();

  // --- Resumo sheet ---
  const resumo = wb.addWorksheet("Resumo", { views: [{ state: "frozen", ySplit: 1 }] });
  resumo.columns = [
    { header: "Pessoa", key: "pessoa", width: 28 },
    { header: "Total (R$)", key: "total", width: 18, style: { numFmt: CURRENCY_FMT } },
  ];
  styleHeader(resumo.getRow(1));
  const peopleWithData = allPeople.filter((p) => (perPerson.get(p.id)?.length ?? 0) > 0);
  peopleWithData.forEach((p, i) => {
    const r = resumo.addRow({ pessoa: p.name, total: Number((totals.get(p.id) ?? 0).toFixed(2)) });
    if (i % 2 === 1) r.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } }; });
  });
  const grandTotal = peopleWithData.reduce((s, p) => s + (totals.get(p.id) ?? 0), 0);
  const totalRow = resumo.addRow({ pessoa: "Total geral", total: Number(grandTotal.toFixed(2)) });
  totalRow.eachCell((c) => {
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
  });

  // --- One sheet per person ---
  for (const p of peopleWithData) {
    const rows = perPerson.get(p.id)!;
    const name = p.name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || `Pessoa ${p.id}`;
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: "Data", key: "date", width: 12 },
      { header: "Origem", key: "origem", width: 18 },
      { header: "Descrição", key: "description", width: 40 },
      { header: "Categoria", key: "category", width: 22 },
      { header: "Parcela", key: "parcela", width: 10 },
      { header: "% Pessoa", key: "pct", width: 10, style: { numFmt: '0"%"' } },
      { header: "Valor total", key: "total", width: 16, style: { numFmt: CURRENCY_FMT } },
      { header: "Valor da pessoa", key: "share", width: 18, style: { numFmt: CURRENCY_FMT } },
    ];
    styleHeader(ws.getRow(1));

    rows
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .forEach((row, i) => {
        const r = ws.addRow(row);
        if (i % 2 === 1) r.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } }; });
      });

    const sheetTotal = rows.reduce((s, r) => s + r.share, 0);
    const tRow = ws.addRow({ description: "Total", share: Number(sheetTotal.toFixed(2)) });
    tRow.eachCell((c) => {
      c.font = { bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
    });
    ws.autoFilter = { from: "A1", to: "H1" };
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();

  const period = monthId
    ? (() => {
        const m = allMonths.find((x) => x.id === Number(monthId));
        return m ? `${MONTHS[m.month - 1]}-${m.year}` : "periodo";
      })()
    : "todos-os-meses";

  return new NextResponse(arrayBuffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="relatorio-${period}.xlsx"`,
    },
  });
}
