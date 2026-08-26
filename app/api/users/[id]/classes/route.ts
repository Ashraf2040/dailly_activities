// app/api/users/[id]/classes/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const classes = await prisma.class.findMany({
      where: {
        teachers: {
          some: {
            id,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("GET /api/users/[id]/classes failed:", error);

    return NextResponse.json(
      { error: "Failed to load teacher classes" },
      { status: 500 }
    );
  }
}