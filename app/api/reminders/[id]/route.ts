import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { invalidateCache } from "@/lib/serverCache";

const parseDateTime = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

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

  const existing = await prisma.reminder.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Reminder tidak ditemukan." }, { status: 404 });
  }

  const reminder = await prisma.reminder.update({
    where: { id: existing.id },
    data: {
      text: typeof payload.text === "string" ? payload.text : undefined,
      done: typeof payload.done === "boolean" ? payload.done : undefined,
      date: typeof payload.date === "string" ? payload.date : undefined,
      time: typeof payload.time === "string" ? payload.time : undefined,
      scheduledAt: payload.scheduledAt !== undefined ? parseDateTime(payload.scheduledAt) : undefined,
      notified: typeof payload.notified === "boolean" ? payload.notified : undefined,
      pointsWeekKey: typeof payload.pointsWeekKey === "string" ? payload.pointsWeekKey : undefined,
    },
  });

  await invalidateCache(`reminders:${user.id}`);
  return NextResponse.json({ reminder });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const existing = await prisma.reminder.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Reminder tidak ditemukan." }, { status: 404 });
  }

  await prisma.reminder.delete({ where: { id: existing.id } });
  await invalidateCache(`reminders:${user.id}`);
  return NextResponse.json({ ok: true });
}
