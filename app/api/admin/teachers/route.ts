import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
    const hashedPassword = await bcrypt.hash(password, 10);
    const teacher = await prisma.user.create({
      data: {
        username,
        name,
        password: hashedPassword,
        role,
        classes: {
          connect: classIds.map((id: string) => ({ id })),
        },
        subjects: {
          connect: subjectIds.map((id: string) => ({ id })),
        },
      },
      include: { classes: true, subjects: true },
    });
    return NextResponse.json(teacher);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}