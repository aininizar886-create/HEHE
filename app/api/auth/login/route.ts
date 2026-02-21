import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  let payload: { email?: string; password?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const password = payload.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
  setSessionCookie(response, token, expiresAt);
  return response;
}
