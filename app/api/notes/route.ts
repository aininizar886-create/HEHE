import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCached, invalidateCache, setCached } from "@/lib/serverCache";

const parseStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

const CACHE_TTL_MS = 5000;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `notes:${user.id}`;
  const cached = getCached<Record<string, unknown>[]>(cacheKey, CACHE_TTL_MS);
  if (cached) {
    return NextResponse.json(
      { notes: cached },
      { headers: { "Cache-Control": "private, max-age=5" } }
    );
  }

  const notes = await prisma.note.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  setCached(cacheKey, notes);
  return NextResponse.json(
    { notes },
    { headers: { "Cache-Control": "private, max-age=5" } }
  );
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

  const title = typeof payload.title === "string" ? payload.title : "";
  const text = typeof payload.text === "string" ? payload.text : "";
  const type = payload.type === "checklist" ? "checklist" : "text";
  const checklist = Array.isArray(payload.checklist) ? payload.checklist : [];

  const note = await prisma.note.create({
    data: {
      userId: user.id,
      title,
      text,
      type,
      checklist,
      mood: typeof payload.mood === "string" ? payload.mood : null,
      tags: parseStringArray(payload.tags),
      color: typeof payload.color === "string" ? payload.color : "rose",
      pattern: typeof payload.pattern === "string" ? payload.pattern : "none",
      font: typeof payload.font === "string" ? payload.font : "body",
      fontSize: typeof payload.fontSize === "number" ? payload.fontSize : 15,
      pinned: Boolean(payload.pinned),
      favorite: Boolean(payload.favorite),
      archived: Boolean(payload.archived),
      energy: typeof payload.energy === "number" ? payload.energy : 60,
    },
  });

  invalidateCache(`notes:${user.id}`);
  return NextResponse.json({ note }, { status: 201 });
}
