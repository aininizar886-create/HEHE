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

  const existing = await prisma.note.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Note tidak ditemukan." }, { status: 404 });
  }

  const note = await prisma.note.update({
    where: { id: existing.id },
    data: {
      title: typeof payload.title === "string" ? payload.title : undefined,
      text: typeof payload.text === "string" ? payload.text : undefined,
      type: payload.type === "checklist" ? "checklist" : payload.type === "text" ? "text" : undefined,
      checklist: Array.isArray(payload.checklist) ? payload.checklist : undefined,
      mood: typeof payload.mood === "string" ? payload.mood : undefined,
      tags: Array.isArray(payload.tags) ? parseStringArray(payload.tags) : undefined,
      color: typeof payload.color === "string" ? payload.color : undefined,
      pattern: typeof payload.pattern === "string" ? payload.pattern : undefined,
      font: typeof payload.font === "string" ? payload.font : undefined,
      fontSize: typeof payload.fontSize === "number" ? payload.fontSize : undefined,
      pinned: typeof payload.pinned === "boolean" ? payload.pinned : undefined,
      favorite: typeof payload.favorite === "boolean" ? payload.favorite : undefined,
      archived: typeof payload.archived === "boolean" ? payload.archived : undefined,
      energy: typeof payload.energy === "number" ? payload.energy : undefined,
    },
  });

  return NextResponse.json({ note });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const existing = await prisma.note.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Note tidak ditemukan." }, { status: 404 });
  }

  await prisma.note.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
