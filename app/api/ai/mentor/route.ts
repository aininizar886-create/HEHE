import { buildMentorPrompt } from "@/src/ai/prompts/mentorPrompt";

type MentorRequest = {
  lesson: string;
  focusCommand: string;
  lastCommand: string;
  result: string;
  mastery: string;
  supportedCommands: string[];
};

const MODEL = "google/gemini-2.5-flash";

const getApiKeys = () => {
  const raw = process.env.OPENROUTER_API_KEYS ?? process.env.OPENROUTER_API_KEY ?? "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const POST = async (request: Request) => {
  const apiKeys = getApiKeys();
  if (!apiKeys.length) {
    return new Response("OPENROUTER_API_KEYS belum diisi.", { status: 500 });
  }

  const body = (await request.json()) as MentorRequest;
  const prompt = buildMentorPrompt(body);

  const basePayload = {
    model: MODEL,
    stream: true,
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: "Kamu mentor Linux yang ramah. Jawab hanya dalam bahasa Indonesia.",
      },
      { role: "user", content: prompt },
    ],
  };

  let response: Response | null = null;
  let lastErrorText = "";

  for (const apiKey of apiKeys) {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Melpin Terminal Mentor",
      },
      body: JSON.stringify(basePayload),
    });

    if (response.ok && response.body) break;
    lastErrorText = await response.text();
    try {
      const parsed = JSON.parse(lastErrorText);
      const code = parsed?.error?.code;
      if (code !== 401 && code !== 402 && code !== 429) {
        response = null;
        break;
      }
    } catch {
      response = null;
      break;
    }
    response = null;
  }

  if (!response || !response.ok || !response.body) {
    return new Response(lastErrorText || "Gagal menghubungi OpenRouter.", { status: 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      let buffer = "";

      const push = async (): Promise<void> => {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.replace(/^data:\s*/, "");
          if (payload === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(payload);
            const chunk = json?.choices?.[0]?.delta?.content;
            if (chunk) controller.enqueue(encoder.encode(chunk));
          } catch {
            // ignore malformed chunks
          }
        }
        await push();
      };

      await push();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
