import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const parseStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.galleryItem.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ items });
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

  const blobUrl = typeof payload.blobUrl === "string" ? payload.blobUrl : "";
  if (!blobUrl) {
    return NextResponse.json({ error: "blobUrl wajib diisi." }, { status: 400 });
  }

  const item = await prisma.galleryItem.create({
    data: {
      userId: user.id,
      blobUrl,
      name: typeof payload.name === "string" ? payload.name : "Foto baru",
      caption: typeof payload.caption === "string" ? payload.caption : "",
      tags: parseStringArray(payload.tags),
      favorite: Boolean(payload.favorite),
      memoryDate: typeof payload.memoryDate === "string" ? payload.memoryDate : null,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
