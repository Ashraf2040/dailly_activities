import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const plan = await prisma.weeklyPlan.findUnique({
      where: { id },
      include: { grade: true, items: { include: { subject: true } } },
    });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(plan, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await prisma.weeklyPlanItem.deleteMany({ where: { weeklyPlanId: id } });
    await prisma.weeklyPlan.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...u } = body;

    const updatedPlan = await prisma.weeklyPlan.update({
      where: { id },
      data: {
        gradeId: u.gradeId,
        week: u.week,
        fromDate: new Date(u.fromDate),
        toDate: new Date(u.toDate),
        note: u.note ?? null,
        dictation: u.dictation ?? null,
        items: {
          deleteMany: { weeklyPlanId: id },
          create: (u.items || []).map((item: any) => ({
            subjectId: item.subjectId,
            unit: item.unit ?? '',
            lessons: item.lessons ?? '',
            pages: item.pages ?? '',
          })),
        },
      },
      include: { grade: true, items: { include: { subject: true } } },
    });
    return NextResponse.json(updatedPlan, { status: 200 });
  } finally {
    await prisma.$disconnect();
  }
}

