// app/api/users/[id]/route.ts
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function DELETE(req: NextRequest, context: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    // Handle case where params might be a Promise
    const params = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));
    const { id } = params;

    // Validate ID (optional, but good practice)
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Delete user using Prisma
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  } finally {
    // Disconnect Prisma to avoid connection leaks
    await prisma.$disconnect();
  }
}