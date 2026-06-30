import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { bankAccounts, statementImports } from "../../../../db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accountId = Number(id);

  const imports = await db.select().from(statementImports).where(eq(statementImports.bankAccountId, accountId));
  if (imports.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir: conta possui importações vinculadas." },
      { status: 409 }
    );
  }

  const deleted = await db.delete(bankAccounts).where(eq(bankAccounts.id, accountId)).returning();
  if (deleted.length === 0) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
