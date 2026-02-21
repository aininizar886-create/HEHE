import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getPresence } from "@/lib/presenceStore";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawIds = url.searchParams.get("ids") ?? "";
  const ids = rawIds
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const statuses = await getPresence(ids);
  return NextResponse.json({ statuses });
}
