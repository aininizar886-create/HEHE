import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

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

  const endpoint = typeof payload.endpoint === "string" ? payload.endpoint : "";
  const keys = typeof payload.keys === "object" && payload.keys ? payload.keys : null;
  const p256dh = keys && typeof (keys as { p256dh?: string }).p256dh === "string" ? (keys as { p256dh: string }).p256dh : "";
  const auth = keys && typeof (keys as { auth?: string }).auth === "string" ? (keys as { auth: string }).auth : "";

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Subscription tidak lengkap." }, { status: 400 });
  }

  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId: user.id,
      p256dh,
      auth,
    },
    create: {
      userId: user.id,
      endpoint,
      p256dh,
      auth,
    },
  });

  return NextResponse.json({ subscription });
}
