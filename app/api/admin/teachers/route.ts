import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Ensure Node.js runtime (safe for Prisma on Vercel)
export const runtime = 'nodejs';

// Serverless-safe Prisma singleton
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      include: { classes: true, subjects: true },
    });
    return NextResponse.json(teachers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { username, name, password, classIds, subjectIds, role } = await request.json();

    if (!username || !name || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const teacher = await prisma.user.create({
      data: {
        username,
        name,
        // Store plain text password (for small-scale/local use only)
        password,
        role,
        ...(Array.isArray(classIds) && classIds.length
          ? { classes: { connect: classIds.map((id: string) => ({ id })) } }
          : {}),
        ...(Array.isArray(subjectIds) && subjectIds.length
          ? { subjects: { connect: subjectIds.map((id: string) => ({ id })) } }
          : {}),
      },
      include: { classes: true, subjects: true },
    });

    return NextResponse.json(teacher);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}
