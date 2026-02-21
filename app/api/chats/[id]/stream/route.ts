import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const parseAfter = (value: string | null) => {
  if (!value) return null;
  const numeric = Number(value);
  const candidate = Number.isNaN(numeric) ? new Date(value) : new Date(numeric);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate;
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await context.params;

  const thread = await prisma.chatThread.findFirst({
    where: {
      id,
      OR: [{ userId: user.id }, { participants: { some: { userId: user.id } } }],
    },
  });
  if (!thread) {
    return new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  let lastTimestamp = parseAfter(url.searchParams.get("after")) ?? new Date();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      let closed = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const delayMs = 1500;

      const poll = async () => {
        if (closed) return;
        try {
          const messages = await prisma.chatMessage.findMany({
            where: { threadId: thread.id, timestamp: { gt: lastTimestamp } },
            orderBy: { timestamp: "asc" },
          });
          if (messages.length) {
            lastTimestamp = new Date(messages[messages.length - 1].timestamp);
            send({ messages });
          }
        } catch (error) {
          console.error("chat stream error", error);
          close();
          return;
        }
        timeoutId = setTimeout(poll, delayMs);
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (timeoutId) clearTimeout(timeoutId);
        controller.close();
      };

      timeoutId = setTimeout(poll, delayMs);
      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
