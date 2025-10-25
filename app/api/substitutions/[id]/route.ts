// app/api/substitutions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.substitution.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 400 });
  }
}
