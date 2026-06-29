import { PDFParse } from "pdf-parse";

async function pdfParse(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  return parser.getText();
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}
