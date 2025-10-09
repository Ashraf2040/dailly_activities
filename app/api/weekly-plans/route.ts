import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(_req: NextRequest) {
  try {
    const plans = await prisma.weeklyPlan.findMany({
      include: { grade: true, items: { include: { subject: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(plans, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gradeId, week, fromDate, toDate, items } = body;

    const weeklyPlan = await prisma.weeklyPlan.create({
      data: {
        gradeId,
        week,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        items: {
          create: (items || []).map((item: any) => ({
            subjectId: item.subjectId,
            unit: item.unit ?? '',
            lessons: item.lessons ?? '',
            pages: item.pages ?? '',
            homework: undefined, // not in schema
            classwork: undefined, // not in schema
          })),
        },
      },
      include: { grade: true, items: { include: { subject: true } } },
    });
    return NextResponse.json(weeklyPlan, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    const updatedPlan = await prisma.weeklyPlan.update({
      where: { id },
      data: {
        gradeId: updateData.gradeId,
        week: updateData.week,
        fromDate: new Date(updateData.fromDate),
        toDate: new Date(updateData.toDate),
        items: {
          deleteMany: { weeklyPlanId: id },
          create: (updateData.items || []).map((item: any) => ({
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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Keep this route’s DELETE only for querystring style if you still call it;
// otherwise rely on the dynamic [id] route.
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deleteId = searchParams.get('deleteId');
    if (!deleteId) {
      return NextResponse.json({ error: 'Missing deleteId parameter' }, { status: 400 });
    }
    await prisma.weeklyPlanItem.deleteMany({ where: { weeklyPlanId: deleteId } });
    await prisma.weeklyPlan.delete({ where: { id: deleteId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
