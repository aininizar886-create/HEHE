import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const parseStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const existing = await prisma.galleryItem.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item tidak ditemukan." }, { status: 404 });
  }

  const item = await prisma.galleryItem.update({
    where: { id: existing.id },
    data: {
      blobUrl: typeof payload.blobUrl === "string" ? payload.blobUrl : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      caption: typeof payload.caption === "string" ? payload.caption : undefined,
      tags: Array.isArray(payload.tags) ? parseStringArray(payload.tags) : undefined,
      favorite: typeof payload.favorite === "boolean" ? payload.favorite : undefined,
      memoryDate: typeof payload.memoryDate === "string" ? payload.memoryDate : undefined,
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const existing = await prisma.galleryItem.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item tidak ditemukan." }, { status: 404 });
  }

  await prisma.galleryItem.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
