import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const parseDateTime = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ reminders });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Reminder tidak boleh kosong." }, { status: 400 });
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      text: text.trim(),
      done: Boolean(payload.done),
      date: typeof payload.date === "string" ? payload.date : null,
      time: typeof payload.time === "string" ? payload.time : null,
      scheduledAt: parseDateTime(payload.scheduledAt),
      notified: Boolean(payload.notified),
      pointsWeekKey: typeof payload.pointsWeekKey === "string" ? payload.pointsWeekKey : null,
    },
  });

  return NextResponse.json({ reminder }, { status: 201 });
}
