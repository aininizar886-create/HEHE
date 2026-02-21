import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";

const OPENROUTER_MODEL = "google/gemini-3.1-pro-preview";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY belum di-set." }, { status: 500 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const message = typeof payload.message === "string" ? payload.message : "";
  const history = Array.isArray(payload.history) ? payload.history : [];
  if (!message.trim()) {
    return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
  }

  const messages = [
    ...history.filter((item) => item && typeof item === "object" && "role" in item && "content" in item),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "Melpin Interactive Space",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json({ error: text || "AI error." }, { status: response.status });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ text: content });
  } catch {
    return NextResponse.json({ error: "Koneksi ke AI gagal." }, { status: 500 });
  }
}
