import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "../../../../lib/pdf-text";
import { importFatura } from "../../../../lib/statement-import-service";
import { parseFaturaText } from "../../../../lib/parsers/itau-fatura";

// pdf-parse reads from the Node fs module; force the Node.js runtime
// (not Edge) so it works in deployed Vercel functions.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const cardId = Number(formData.get("cardId"));
    const referenceYear = Number(formData.get("referenceYear"));
    const referenceMonth = Number(formData.get("referenceMonth"));

    if (!file || !cardId || !referenceYear || !referenceMonth) {
      return NextResponse.json({ error: "file, cardId, referenceYear, and referenceMonth are required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buffer);
    const parsed = parseFaturaText(text, referenceYear, referenceMonth);
    const parsedTotal = parsed.reduce((s, t) => s + t.amount, 0);
    const result = await importFatura({ text, referenceYear, referenceMonth, cardId, fileName: file.name });

    return NextResponse.json({
      ...result,
      _parsedCount: parsed.length,
      _parsedTotal: parsedTotal.toFixed(2),
      _debug: result.created === 0 ? text.slice(0, 3000) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
