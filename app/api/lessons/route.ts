import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { classId, subjectId, date, unit, lesson,pages, objective, homework, comments } = await req.json();

  try {
    const newLesson = await prisma.lesson.create({
      data: {
        teacherId: session.user.id,
        classId,
        subjectId,
        date: new Date(date),
        unit,
        pages,
        lesson,
        objective,
        homework,
        comments,
      },
    });
    return NextResponse.json(newLesson);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  const date = searchParams.get('date');

  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        classId: classId || undefined,
        date: date ? { gte: new Date(date), lte: new Date(date) } : undefined,
      },
      include: { teacher: true, class: true, subject: true },
    });
    return NextResponse.json(lessons);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
  }
}