import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "./db";

export const SESSION_COOKIE_NAME = "melpin_session";
const SESSION_TTL_DAYS = 30;
const MAGIC_LINK_TTL_MINUTES = 15;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const hashPassword = async (password: string) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string) => bcrypt.compare(password, hash);

export const createSession = async (userId: string) => {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
  return { token, expiresAt };
};

export const setSessionCookie = (response: NextResponse, token: string, expiresAt: Date) => {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
};

export const getSessionUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
};

export const revokeSession = async (token?: string | null) => {
  if (!token) return;
  const tokenHash = hashToken(token);
  const existing = await prisma.session.findUnique({ where: { tokenHash } });
  if (existing) {
    await prisma.session.delete({ where: { id: existing.id } });
  }
};

export const createMagicLinkToken = async (userId: string) => {
  const token = randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);
  await prisma.magicLinkToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
  return { token, expiresAt };
};

export const consumeMagicLinkToken = async (token: string) => {
  const tokenHash = hashToken(token);
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await prisma.magicLinkToken.delete({ where: { id: record.id } });
    return null;
  }
  await prisma.magicLinkToken.delete({ where: { id: record.id } });
  return record.userId;
};
