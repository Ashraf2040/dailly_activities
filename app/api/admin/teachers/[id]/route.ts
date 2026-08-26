// app/api/admin/teachers/[id]/route.ts

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

// ============================================================
// PATCH — Update teacher
// ============================================================

export async function PATCH(
  req: Request,
  { params }: RouteContext
) {
  const { id } = await params;

  try {
    const body = await req.json();

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

    if (typeof username === "string") {
      data.username = username;
    }

    if (typeof name === "string") {
      data.name = name;
    }

    if (typeof password === "string" && password.trim().length > 0) {
      data.password = password.trim();
    }

    // Replace teacher's classes
    if (Array.isArray(classIds)) {
      data.classes = {
        set: classIds.map((classId: string) => ({
          id: classId,
        })),
      };
    }

    // Replace teacher's subjects
    if (Array.isArray(subjectIds)) {
      data.subjects = {
        set: subjectIds.map((subjectId: string) => ({
          id: subjectId,
        })),
      };
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
    console.error("PATCH /api/admin/teachers/[id] failed:", err);

    return NextResponse.json(
      {
        error: err?.message || "Failed to update teacher",
      },
      { status: 400 }
    );
  }
}

// ============================================================
// DELETE — Delete teacher
// ============================================================

export async function DELETE(
  _req: Request,
  { params }: RouteContext
) {
  const { id } = await params;

  try {
    // First make sure the user exists
    const teacher = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        name: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    // Safety check: don't accidentally delete an admin
    if (teacher.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Only teachers can be deleted from this endpoint" },
        { status: 400 }
      );
    }

    // Remove many-to-many relationships first
    await prisma.user.update({
      where: { id },
      data: {
        classes: {
          set: [],
        },
        subjects: {
          set: [],
        },
      },
    });

    // Delete the teacher
    const deleted = await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Teacher deleted successfully",
        teacher: {
          id: deleted.id,
          name: deleted.name,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("DELETE /api/admin/teachers/[id] failed:", err);

    return NextResponse.json(
      {
        error: err?.message || "Failed to delete teacher",
      },
      { status: 500 }
    );
  }
}