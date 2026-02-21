import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCached, invalidateCache, setCached } from "@/lib/serverCache";
import { uploadDataUrl } from "@/lib/storage";

const parseStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

const CACHE_TTL_MS = 5000;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `gallery:${user.id}`;
  const cached = await getCached<Record<string, unknown>[]>(cacheKey, CACHE_TTL_MS);
  if (cached !== undefined) {
    return NextResponse.json(
      { items: cached },
      { headers: { "Cache-Control": "private, max-age=5" } }
    );
  }

  const items = await prisma.galleryItem.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  await setCached(cacheKey, items, CACHE_TTL_MS);
  return NextResponse.json(
    { items },
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

  const blobUrl = typeof payload.blobUrl === "string" ? payload.blobUrl : "";
  if (!blobUrl) {
    return NextResponse.json({ error: "blobUrl wajib diisi." }, { status: 400 });
  }

  const resolvedBlobUrl = await uploadDataUrl(blobUrl, `gallery/${user.id}`);

  const item = await prisma.galleryItem.create({
    data: {
      userId: user.id,
      blobUrl: resolvedBlobUrl,
      name: typeof payload.name === "string" ? payload.name : "Foto baru",
      caption: typeof payload.caption === "string" ? payload.caption : "",
      tags: parseStringArray(payload.tags),
      favorite: Boolean(payload.favorite),
      memoryDate: typeof payload.memoryDate === "string" ? payload.memoryDate : null,
    },
  });

  await invalidateCache(`gallery:${user.id}`);
  return NextResponse.json({ item }, { status: 201 });
}
