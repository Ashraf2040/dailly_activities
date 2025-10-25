// app/api/users/[id]/classes/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const classes = await prisma.class.findMany({
    where: { teachers: { some: { id } } }, // implicit m-n filter
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(classes);
}