import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      profile,
    },
  });
}
