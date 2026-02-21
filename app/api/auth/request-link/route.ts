import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createMagicLinkToken } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/email";

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

  const user =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.create({ data: { email } }));

  const { token } = await createMagicLinkToken(user.id);
  await sendMagicLinkEmail(email, token);

  return NextResponse.json({ ok: true });
}
