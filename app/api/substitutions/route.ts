import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { date, rows } = await req.json();
  if (!date || !Array.isArray(rows)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const day = new Date(date);
  const created = await prisma.$transaction(async (tx) => {
    const inserts = rows.map((r: any) =>
      tx.substitution.create({
        data: {
          date: day,
          dayIndex: r.dayIndex,
          session: r.session,
          start: r.start,
          end: r.end,
          classId: r.classId,
          subjectId: r.subjectId ?? null,
          absentId: r.absentTeacherId,
          replacementId: r.replacementId,
        },
      })
    );
    const res = await Promise.all(inserts);
    return res;
  });

  return NextResponse.json({ count: created.length }, { status: 201 });
}
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json([], { status: 200 });
  const d = new Date(date + "T00:00:00.000Z");
  const next = new Date(d); next.setUTCDate(d.getUTCDate() + 1);

  const rows = await prisma.substitution.findMany({
    where: { date: { gte: d, lt: next } },
    orderBy: [{ session: "asc" }],
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      absent: { select: { id: true, name: true } },
      replacement: { select: { id: true, name: true } },
    }
  });
  return NextResponse.json(rows);
}