import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "../../../../lib/pdf-text";
import { importFatura } from "../../../../lib/statement-import-service";

// pdf-parse reads from the Node fs module; force the Node.js runtime
// (not Edge) so it works in deployed Vercel functions.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const cardId = Number(formData.get("cardId"));
    const referenceYear = Number(formData.get("referenceYear"));

    if (!file || !cardId || !referenceYear) {
      return NextResponse.json({ error: "file, cardId, and referenceYear are required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buffer);
    const result = await importFatura({ text, referenceYear, cardId, fileName: file.name });

    return NextResponse.json({ ...result, _debug: result.created === 0 ? text.slice(0, 3000) : undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
