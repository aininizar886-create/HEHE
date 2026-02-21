const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

type Env = {
  MAIL_TOKEN: string;
  MAIL_FROM: string;
  MAIL_FROM_NAME?: string;
};

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === "GET") {
      return json({ ok: true });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, { status: 405 });
    }

    const auth = request.headers.get("Authorization") ?? "";
    if (!env.MAIL_TOKEN || auth !== `Bearer ${env.MAIL_TOKEN}`) {
      return json({ error: "Unauthorized." }, { status: 401 });
    }

    let payload: {
      to?: string;
      subject?: string;
      text?: string;
      html?: string;
      from?: string;
      replyTo?: string;
    } = {};
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const to = payload.to?.trim();
    const subject = payload.subject?.trim();
    const text = payload.text ?? "";
    const html = payload.html ?? "";
    const from = payload.from?.trim() || env.MAIL_FROM;
    const replyTo = payload.replyTo?.trim();

    if (!to || !subject || !from) {
      return json({ error: "Missing required fields." }, { status: 400 });
    }

    const mailBody = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: env.MAIL_FROM_NAME || undefined },
      subject,
      content: [
        { type: "text/plain", value: text || html.replace(/<[^>]+>/g, "") },
        { type: "text/html", value: html || text },
      ],
      reply_to: replyTo ? { email: replyTo } : undefined,
    };

    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mailBody),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return json(
        { error: "MailChannels error.", detail: detail || response.statusText },
        { status: response.status }
      );
    }

    return json({ ok: true });
  },
};
