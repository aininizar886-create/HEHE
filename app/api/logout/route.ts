import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearSessionCookie, revokeSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await revokeSession(token);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
