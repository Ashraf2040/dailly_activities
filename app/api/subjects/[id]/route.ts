import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lessonCount = await prisma.lesson.count({
      where: { subjectId: params.id },
    });

    if (lessonCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete — ${lessonCount} lesson(s) are still associated with this subject. Remove those lessons first.`,
        },
        { status: 409 }
      );
    }

    await prisma.subject.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete subject. It may be referenced by other records.' },
      { status: 500 }
    );
  }
}