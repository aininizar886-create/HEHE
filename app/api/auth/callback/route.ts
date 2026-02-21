import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { supabaseAnon } from "@/lib/supabase";

const getBaseUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const accessToken = url.searchParams.get("access_token") ?? "";
  if (!accessToken) {
    return NextResponse.redirect(`${getBaseUrl()}/?login=invalid`);
  }

  const { data, error } = await supabaseAnon.auth.getUser(accessToken);
  if (error || !data.user?.email) {
    return NextResponse.redirect(`${getBaseUrl()}/?login=expired`);
  }

  const user = await prisma.user.upsert({
    where: { email: data.user.email },
    update: { name: data.user.user_metadata?.name ?? undefined },
    create: { email: data.user.email, name: data.user.user_metadata?.name ?? undefined },
  });

  const { token: sessionToken, expiresAt } = await createSession(user.id);
  const response = NextResponse.redirect(`${getBaseUrl()}/?login=success`);
  setSessionCookie(response, sessionToken, expiresAt);
  return response;
}
