import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const MIN_PASSWORD_LEN = 8;

const findSupabaseUserId = async (email: string) => {
  let page = 1;
  const perPage = 200;
  while (page <= 5) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
};

export async function POST(request: Request) {
  let payload: { token?: string; password?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const token = (payload.token ?? "").trim();
  const password = payload.password ?? "";
  if (!token) {
    return NextResponse.json({ error: "Token reset tidak valid." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return NextResponse.json({ error: `Password minimal ${MIN_PASSWORD_LEN} karakter.` }, { status: 400 });
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Token reset sudah kadaluarsa." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  const supabaseUserId = await findSupabaseUserId(user.email);
  if (!supabaseUserId) {
    return NextResponse.json({ error: "Akun belum aktif di Supabase." }, { status: 404 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, { password });
  if (error) {
    return NextResponse.json({ error: error.message ?? "Gagal reset password." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
