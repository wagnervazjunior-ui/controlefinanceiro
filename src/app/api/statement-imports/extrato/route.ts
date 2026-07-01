import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "../../../../lib/pdf-text";
import { importExtrato } from "../../../../lib/statement-import-service";

// pdf-parse reads from the Node fs module; force the Node.js runtime
// (not Edge) so it works in deployed Vercel functions.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
