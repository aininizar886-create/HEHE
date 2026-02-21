import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCached, setCached } from "@/lib/serverCache";

const CACHE_TTL_MS = 2000;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const cacheKey = `session:${user.id}`;
  const cached = getCached<Record<string, unknown>>(cacheKey, CACHE_TTL_MS);
  if (cached !== undefined) {
    return NextResponse.json({ user: cached }, { headers: { "Cache-Control": "private, max-age=2" } });
  }

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    profile,
  };
  setCached(cacheKey, payload);
  return NextResponse.json(
    {
      user: payload,
    },
    { headers: { "Cache-Control": "private, max-age=2" } }
  );
}
