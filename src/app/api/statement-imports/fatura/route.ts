import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "../../../../lib/pdf-text";
import { importFatura } from "../../../../lib/statement-import-service";

export async function POST(request: NextRequest) {
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

  return NextResponse.json(result);
}
