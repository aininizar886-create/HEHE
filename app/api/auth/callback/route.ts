import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { consumeMagicLinkToken, createSession, setSessionCookie } from "@/lib/auth";

const getBaseUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${getBaseUrl()}/?login=invalid`);
  }

  const userId = await consumeMagicLinkToken(token);
  if (!userId) {
    return NextResponse.redirect(`${getBaseUrl()}/?login=expired`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.redirect(`${getBaseUrl()}/?login=invalid`);
  }

  const { token: sessionToken, expiresAt } = await createSession(user.id);
  const response = NextResponse.redirect(`${getBaseUrl()}/?login=success`);
  setSessionCookie(response, sessionToken, expiresAt);
  return response;
}
