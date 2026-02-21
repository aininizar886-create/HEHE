import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { invalidateCache } from "@/lib/serverCache";

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

  const existing = await prisma.chatThread.findFirst({
    where: {
      id,
      OR: [{ userId: user.id }, { participants: { some: { userId: user.id } } }],
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Thread tidak ditemukan." }, { status: 404 });
  }

  const thread = await prisma.chatThread.update({
    where: { id: existing.id },
    data: {
      title: typeof payload.title === "string" ? payload.title : undefined,
      subtitle: typeof payload.subtitle === "string" ? payload.subtitle : undefined,
      avatar: typeof payload.avatar === "string" ? payload.avatar : undefined,
      pinned: typeof payload.pinned === "boolean" ? payload.pinned : undefined,
    },
  });

  await invalidateCache(`chats:${user.id}`);
  return NextResponse.json({ thread });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const existing = await prisma.chatThread.findFirst({
    where: {
      id,
      OR: [{ userId: user.id }, { participants: { some: { userId: user.id } } }],
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Thread tidak ditemukan." }, { status: 404 });
  }

  await prisma.chatThread.delete({ where: { id: existing.id } });
  await invalidateCache(`chats:${user.id}`);
  return NextResponse.json({ ok: true });
}
