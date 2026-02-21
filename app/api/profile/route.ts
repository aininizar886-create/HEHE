import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
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

  const data = {
    name: typeof payload.name === "string" ? payload.name.trim() : undefined,
    birthDate: typeof payload.birthDate === "string" ? payload.birthDate : undefined,
    status: typeof payload.status === "string" ? payload.status.trim() : undefined,
    bio: typeof payload.bio === "string" ? payload.bio.trim() : undefined,
    avatar: typeof payload.avatar === "string" ? payload.avatar : undefined,
    avatarImage: typeof payload.avatarImage === "string" ? payload.avatarImage : undefined,
    avatarAsset: typeof payload.avatarAsset === "string" ? payload.avatarAsset : undefined,
    accentColor: typeof payload.accentColor === "string" ? payload.accentColor : undefined,
    accentSoftness: typeof payload.accentSoftness === "number" ? payload.accentSoftness : undefined,
    terminalHost: typeof payload.terminalHost === "string" ? payload.terminalHost : undefined,
    terminalName: typeof payload.terminalName === "string" ? payload.terminalName : undefined,
    prayerCityId: typeof payload.prayerCityId === "string" ? payload.prayerCityId : undefined,
    prayerCityName: typeof payload.prayerCityName === "string" ? payload.prayerCityName : undefined,
    timezone: typeof payload.timezone === "string" ? payload.timezone : undefined,
  };

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...data,
    },
    update: data,
  });

  return NextResponse.json({ profile });
}
