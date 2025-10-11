// app/api/admin/teachers/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcryptjs'; // if hashing
const prisma = new PrismaClient();
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const body = await req.json();

    // Accept partial updates; only set what comes in
    const {
      username,
      name,
      password,
      classIds,
      subjectIds,
    }: {
      username?: string;
      name?: string;
      password?: string;
      classIds?: string[];
      subjectIds?: string[];
    } = body || {};

    const data: any = {};

    if (typeof username === 'string') data.username = username;
    if (typeof name === 'string') data.name = name;

    // Optional password update
    if (typeof password === 'string' && password.trim().length > 0) {
      // const hash = await bcrypt.hash(password.trim(), 10);
      // data.password = hash;
      data.password = password.trim(); // keep your existing logic if hashing is not used yet
    }

    // Replace class links if provided (adds missing, removes absent)
    if (Array.isArray(classIds)) {
      data.classes = { set: classIds.map((id: string) => ({ id })) };
    }

    // Replace subject links if provided (adds missing, removes absent)
    if (Array.isArray(subjectIds)) {
      data.subjects = { set: subjectIds.map((id: string) => ({ id })) };
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      include: {
        classes: true,
        subjects: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    // keep your existing error shape/status if you already have one
    const message =
      err?.message || 'Failed to update teacher';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
