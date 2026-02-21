import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const getDisplayName = (user: { email: string; name?: string | null; profile?: { name?: string | null } | null }) =>
  user.profile?.name?.trim() || user.name?.trim() || user.email.split("@")[0];

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  if (search.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { profile: { is: { name: { contains: search, mode: "insensitive" } } } },
      ],
    },
    include: {
      profile: true,
    },
    take: 8,
  });

  const result = users.map((candidate) => ({
    id: candidate.id,
    email: candidate.email,
    displayName: getDisplayName(candidate),
    status: candidate.profile?.status ?? undefined,
    avatar: candidate.profile?.avatar ?? undefined,
  }));

  return NextResponse.json({ users: result });
}
