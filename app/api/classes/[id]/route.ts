import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Prevent deleting a class that still has lessons
    const lessonCount = await prisma.lesson.count({
      where: { classId: params.id },
    });

    if (lessonCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete — ${lessonCount} lesson(s) are still associated with this class. Remove those lessons first.`,
        },
        { status: 409 }
      );
    }

    // Prisma implicit M2M join-table entries are removed automatically
    await prisma.class.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete class. It may be referenced by other records.' },
      { status: 500 }
    );
  }
}