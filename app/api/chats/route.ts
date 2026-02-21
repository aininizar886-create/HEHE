import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCached, invalidateCache, setCached } from "@/lib/serverCache";

const getDisplayName = (user: { name?: string | null; email: string; profile?: { name?: string | null } | null }) =>
  user.profile?.name?.trim() || user.name?.trim() || user.email.split("@")[0];

const getDisplayAvatar = (profile?: {
  avatar?: string | null;
  avatarImage?: string | null;
  avatarAsset?: string | null;
} | null) => profile?.avatarImage || profile?.avatarAsset || profile?.avatar || "💬";

const CACHE_TTL_MS = 2000;

const buildThreadDisplay = (
  thread: {
    kind: "ai" | "realtime";
    title: string;
    subtitle: string;
    avatar: string;
    participants: Array<{
      userId: string;
      user: {
        id: string;
        email: string;
        name?: string | null;
        profile?: {
          name?: string | null;
          status?: string | null;
          avatar?: string | null;
          avatarImage?: string | null;
          avatarAsset?: string | null;
        } | null;
      };
    }>;
  },
  currentUserId: string
) => {
  if (thread.kind === "ai") {
    return {
      displayTitle: "Melpin Assistant",
      displaySubtitle: "Teman ngobrol AI",
      displayAvatar: "🤖",
      contactId: null,
    };
  }
  const other = thread.participants.find((item) => item.userId !== currentUserId);
  const otherUser = other?.user;
  if (!otherUser) {
    return {
      displayTitle: thread.title,
      displaySubtitle: thread.subtitle,
      displayAvatar: thread.avatar,
      contactId: null,
    };
  }
  return {
    displayTitle: getDisplayName(otherUser),
    displaySubtitle: otherUser.profile?.status ?? otherUser.email,
    displayAvatar: getDisplayAvatar(otherUser.profile),
    contactId: otherUser.id,
  };
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `chats:${user.id}`;
  const cached = getCached<Record<string, unknown>[]>(cacheKey, CACHE_TTL_MS);
  if (cached) {
    return NextResponse.json(
      { threads: cached },
      { headers: { "Cache-Control": "private, max-age=2" } }
    );
  }

  const threads = await prisma.chatThread.findMany({
    where: {
      OR: [{ userId: user.id }, { participants: { some: { userId: user.id } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
      participants: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  const safeThreads = await Promise.all(
    threads.map(async (thread) => {
      const hasParticipant = thread.participants.some((item) => item.userId === user.id);
      if (!hasParticipant) {
        await prisma.chatParticipant.create({
          data: {
            threadId: thread.id,
            userId: user.id,
          },
        });
      }
      const display = buildThreadDisplay(
        {
          kind: thread.kind,
          title: thread.title,
          subtitle: thread.subtitle,
          avatar: thread.avatar,
          participants: thread.participants,
        },
        user.id
      );
      return { ...thread, ...display };
    })
  );

  setCached(cacheKey, safeThreads);
  return NextResponse.json(
    { threads: safeThreads },
    { headers: { "Cache-Control": "private, max-age=2" } }
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const kind = payload.kind === "ai" ? "ai" : "realtime";
  const contactEmail = typeof payload.contactEmail === "string" ? payload.contactEmail.trim().toLowerCase() : "";
  let contactUser: {
    id: string;
    email: string;
    name?: string | null;
    profile?: {
      name?: string | null;
      status?: string | null;
      avatar?: string | null;
      avatarImage?: string | null;
      avatarAsset?: string | null;
    } | null;
  } | null = null;
  if (contactEmail) {
    contactUser = await prisma.user.findUnique({
      where: { email: contactEmail },
      include: { profile: true },
    });
    if (!contactUser) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }
    const existing = await prisma.chatThread.findFirst({
      where: {
        kind: "realtime",
        participants: { some: { userId: user.id } },
        AND: [{ participants: { some: { userId: contactUser.id } } }],
      },
      include: { participants: true },
    });
    if (existing && existing.participants.length === 2) {
      const display = buildThreadDisplay(
        {
          kind: existing.kind,
          title: existing.title,
          subtitle: existing.subtitle,
          avatar: existing.avatar,
          participants: existing.participants.map((participant) => ({
            userId: participant.userId,
            user: participant.userId === user.id ? user : contactUser!,
          })),
        },
        user.id
      );
      invalidateCache(`chats:${user.id}`);
      return NextResponse.json({ thread: { ...existing, ...display } }, { status: 200 });
    }
  }

  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : contactUser
      ? getDisplayName(contactUser)
      : "Chat";
  const subtitle =
    typeof payload.subtitle === "string" ? payload.subtitle : contactUser?.profile?.status ?? "";
  const avatar =
    typeof payload.avatar === "string" ? payload.avatar : getDisplayAvatar(contactUser?.profile ?? null);

  const thread = await prisma.chatThread.create({
    data: {
      userId: user.id,
      title,
      subtitle,
      kind,
      avatar,
      pinned: Boolean(payload.pinned),
      participants: {
        create: [
          { userId: user.id },
          ...(contactUser ? [{ userId: contactUser.id }] : []),
        ],
      },
    },
    include: {
      participants: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  const display = buildThreadDisplay(
    {
      kind: thread.kind,
      title: thread.title,
      subtitle: thread.subtitle,
      avatar: thread.avatar,
      participants: thread.participants,
    },
    user.id
  );

  invalidateCache(`chats:${user.id}`);
  return NextResponse.json({ thread: { ...thread, ...display } }, { status: 201 });
}
