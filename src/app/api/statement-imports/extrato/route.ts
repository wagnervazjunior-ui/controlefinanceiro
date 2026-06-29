import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "../../../../lib/pdf-text";
import { importExtrato } from "../../../../lib/statement-import-service";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const bankAccountId = Number(formData.get("bankAccountId"));
  const referenceYear = Number(formData.get("referenceYear"));
  const referenceMonth = Number(formData.get("referenceMonth"));

  if (!file || !bankAccountId || !referenceYear || !referenceMonth) {
    return NextResponse.json(
      { error: "file, bankAccountId, referenceYear, and referenceMonth are required" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfText(buffer);
  const result = await importExtrato({ text, referenceYear, referenceMonth, bankAccountId, fileName: file.name });

  return NextResponse.json(result);
}
