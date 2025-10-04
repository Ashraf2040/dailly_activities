// app/api/lessons/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

// Optional: ensure Node.js runtime if needed by deployment target
export const runtime = 'nodejs';

// Serverless-safe Prisma client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lessonId = params.id;
    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lesson id' }, { status: 400 });
    }

    // Parse and whitelist fields
    const body = await req.json().catch(() => ({}));
    const { unit, lesson, objective, homework, pages, comments } = body ?? {};
    const data: Record<string, any> = {};
    if (typeof unit === 'string') data.unit = unit;
    if (typeof lesson === 'string') data.lesson = lesson;
    if (typeof objective === 'string') data.objective = objective;
    if (typeof homework === 'string') data.homework = homework;
    if (typeof pages === 'string') data.pages = pages;
    if (typeof comments === 'string') data.comments = comments;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Load existing to check ownership and date
    const existing = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, teacherId: true, date: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (existing.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Enforce "current day only"
    const todayStr = new Date().toISOString().slice(0, 10);
    const existingDateStr =
      typeof (existing as any).date === 'string'
        ? (existing as any).date
        : new Date((existing as any).date).toISOString().slice(0, 10);

    if (existingDateStr !== todayStr) {
      return NextResponse.json({ error: 'Editing allowed only for today’s lessons' }, { status: 403 });
    }

    // Update and include relations for UI
    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data,
      include: {
        class: true,
        subject: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error('PUT /api/lessons/[id] failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
