import { NextResponse } from "next/server";

import { supabaseAnon } from "@/lib/supabase";

export async function POST(request: Request) {
  let payload: { email?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }

  const redirectTo = process.env.APP_URL ? `${process.env.APP_URL}/` : undefined;
  const { error } = await supabaseAnon.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Gagal mengirim magic link." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
