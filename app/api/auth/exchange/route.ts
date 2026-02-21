import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { supabaseAnon } from "@/lib/supabase";

export async function POST(request: Request) {
  let payload: { accessToken?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const accessToken = (payload.accessToken ?? "").trim();
  if (!accessToken) {
    return NextResponse.json({ error: "Token tidak valid." }, { status: 400 });
  }

  const { data, error } = await supabaseAnon.auth.getUser(accessToken);
  if (error || !data.user?.email) {
    return NextResponse.json({ error: "Token kadaluarsa." }, { status: 401 });
  }

  const user = await prisma.user.upsert({
    where: { email: data.user.email },
    update: { name: data.user.user_metadata?.name ?? undefined },
    create: { email: data.user.email, name: data.user.user_metadata?.name ?? undefined },
  });

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, token, expiresAt);
  return response;
}
