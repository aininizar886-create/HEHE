import { NextResponse } from "next/server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { invalidateCache } from "@/lib/serverCache";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const url = new URL(request.url);
  const afterRaw = url.searchParams.get("after");
  let afterDate: Date | null = null;
  if (afterRaw) {
    const numeric = Number(afterRaw);
    const candidate = Number.isNaN(numeric) ? new Date(afterRaw) : new Date(numeric);
    if (!Number.isNaN(candidate.getTime())) {
      afterDate = candidate;
    }
  }

  try {
    const thread = await prisma.chatThread.findFirst({
      where: {
        id,
        OR: [{ userId: user.id }, { participants: { some: { userId: user.id } } }],
      },
    });
    if (!thread) {
      return NextResponse.json({ error: "Thread tidak ditemukan." }, { status: 404 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: afterDate ? { threadId: thread.id, timestamp: { gt: afterDate } } : { threadId: thread.id },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("chat messages error", error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const thread = await prisma.chatThread.findFirst({
    where: {
      id,
      OR: [{ userId: user.id }, { participants: { some: { userId: user.id } } }],
    },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread tidak ditemukan." }, { status: 404 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
  }
  const clientId = typeof payload.id === "string" ? payload.id : undefined;
  const replyToId = typeof payload.replyToId === "string" ? payload.replyToId : undefined;

  const isAssistant = payload.from === "assistant" && thread.kind === "ai";
  const message = await prisma.chatMessage.create({
    data: {
      ...(clientId ? { id: clientId } : {}),
      threadId: thread.id,
      from: isAssistant ? "assistant" : "me",
      senderId: isAssistant ? null : user.id,
      text: text.trim(),
      replyToId,
      kind: payload.kind === "share" ? "share" : "text",
      share: payload.share && typeof payload.share === "object" ? payload.share : undefined,
      shareCaption: typeof payload.shareCaption === "string" ? payload.shareCaption : undefined,
      timestamp: payload.timestamp ? new Date(String(payload.timestamp)) : new Date(),
    },
  });

  await invalidateCache(`chats:${user.id}`);
  return NextResponse.json({ message }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const thread = await prisma.chatThread.findFirst({
    where: {
      id,
      OR: [{ userId: user.id }, { participants: { some: { userId: user.id } } }],
    },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread tidak ditemukan." }, { status: 404 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const messageId = typeof payload.messageId === "string" ? payload.messageId : "";
  if (!messageId) {
    return NextResponse.json({ error: "Message id kosong." }, { status: 400 });
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  if (!action) {
    return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
  }

  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, threadId: thread.id },
  });
  if (!message) {
    return NextResponse.json({ error: "Pesan tidak ditemukan." }, { status: 404 });
  }

  if (action === "edit") {
    if (message.senderId !== user.id) {
      return NextResponse.json({ error: "Tidak boleh edit pesan orang lain." }, { status: 403 });
    }
    const text = typeof payload.text === "string" ? payload.text : "";
    if (!text.trim()) {
      return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
    }
    const updated = await prisma.chatMessage.update({
      where: { id: message.id },
      data: { text: text.trim(), editedAt: new Date(), deletedAt: null },
    });
    await invalidateCache(`chats:${user.id}`);
    return NextResponse.json({ message: updated }, { status: 200 });
  }

  if (action === "delete") {
    if (message.senderId !== user.id) {
      return NextResponse.json({ error: "Tidak boleh hapus pesan orang lain." }, { status: 403 });
    }
    const updated = await prisma.chatMessage.update({
      where: { id: message.id },
      data: {
        text: "",
        share: Prisma.DbNull,
        shareCaption: null,
        deletedAt: new Date(),
        editedAt: null,
      },
    });
    await invalidateCache(`chats:${user.id}`);
    return NextResponse.json({ message: updated }, { status: 200 });
  }

  if (action === "react") {
    const emoji = typeof payload.emoji === "string" ? payload.emoji : "";
    if (!emoji) {
      return NextResponse.json({ error: "Emoji kosong." }, { status: 400 });
    }
    const reactions = (message.reactions ?? {}) as Record<string, string[]>;
    const existing = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
    const has = existing.includes(user.id);
    const next = has ? existing.filter((id) => id !== user.id) : [...existing, user.id];
    if (next.length) {
      reactions[emoji] = next;
    } else {
      delete reactions[emoji];
    }
    const updated = await prisma.chatMessage.update({
      where: { id: message.id },
      data: { reactions },
    });
    await invalidateCache(`chats:${user.id}`);
    return NextResponse.json({ message: updated }, { status: 200 });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const thread = await prisma.chatThread.findFirst({
    where: { id, userId: user.id },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread tidak ditemukan." }, { status: 404 });
  }

  await prisma.chatMessage.deleteMany({ where: { threadId: thread.id } });
  await invalidateCache(`chats:${user.id}`);
  return NextResponse.json({ ok: true });
}
