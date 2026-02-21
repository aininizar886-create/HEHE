import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const MIN_PASSWORD_LEN = 8;

export async function POST(request: Request) {
  let payload: { email?: string; password?: string; name?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const password = payload.password ?? "";
  const name = payload.name?.trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return NextResponse.json({ error: `Password minimal ${MIN_PASSWORD_LEN} karakter.` }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Gagal membuat akun." }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: name || undefined },
    create: { email, name },
  });

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
  setSessionCookie(response, token, expiresAt);
  return response;
}
