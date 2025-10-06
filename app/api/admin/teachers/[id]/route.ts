// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

// Ensure Node.js runtime for Prisma on Vercel
export const runtime = 'nodejs';

// Serverless-safe Prisma client reuse
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function DELETE(req: NextRequest, { params }: { params: { id?: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prefer params.id; fall back to parsing from URL if needed
    let id = params?.id;
    if (!id) {
      const { pathname } = req.nextUrl;
      const segments = pathname.split('/');
      id = segments[segments.length - 1] || undefined;
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Clean up dependent records to avoid FK errors (adjust to your schema)
    // Example: if lessons reference teacherId -> user.id
    await prisma.$transaction(async (tx) => {
      // If lessons model uses teacherId referencing User(id), delete them first
      await tx.lesson.deleteMany({ where: { teacherId: id } }).catch(() => {});

      // If there are join tables for classes/subjects assigned to teachers, delete them here
      // Replace with actual model names or remove if not applicable:
      // await tx.teacherClasses.deleteMany({ where: { teacherId: id } });
      // await tx.teacherSubjects.deleteMany({ where: { teacherId: id } });

      // Finally delete the user
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
