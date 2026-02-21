import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { touchPresence } from "@/lib/presenceStore";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await touchPresence(user.id);
  return NextResponse.json({ ok: true });
}
