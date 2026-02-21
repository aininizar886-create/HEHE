import "server-only";

import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST ?? "";
const smtpPort = Number(process.env.SMTP_PORT ?? "465");
const smtpUser = process.env.SMTP_USER ?? "";
const smtpPass = process.env.SMTP_PASS ?? "";
const emailFrom = process.env.EMAIL_FROM ?? "";
const mailWorkerUrl = process.env.MAIL_WORKER_URL ?? "";
const mailWorkerToken = process.env.MAIL_WORKER_TOKEN ?? "";
const resolveFromAddress = () => {
  const candidate = emailFrom.trim();
  if (candidate && candidate.includes("@")) return candidate;
  return smtpUser;
};

const getBaseUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export const sendMagicLinkEmail = async (email: string, token: string) => {
  const fromAddress = resolveFromAddress();
  if (!fromAddress || !fromAddress.includes("@")) {
    throw new Error("Alamat pengirim email belum di-set.");
  }

  const callbackUrl = `${getBaseUrl()}/api/auth/callback?token=${token}`;
  const subject = "Login Melpin - Magic Link";
  const text = `Klik link ini buat masuk: ${callbackUrl}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Login Melpin</h2>
      <p>Klik tombol ini untuk login. Link berlaku 15 menit.</p>
      <p><a href="${callbackUrl}" style="display:inline-block;padding:10px 16px;background:#ff4fa3;color:#000;text-decoration:none;border-radius:12px">Masuk</a></p>
      <p>Atau copy link ini:</p>
      <p>${callbackUrl}</p>
    </div>
  `;

  const replyTo = emailFrom && emailFrom !== fromAddress ? emailFrom : undefined;

  if (mailWorkerUrl && mailWorkerToken) {
    const response = await fetch(mailWorkerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mailWorkerToken}`,
      },
      body: JSON.stringify({
        to: email,
        subject,
        text,
        html,
        from: fromAddress,
        replyTo,
      }),
    });
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || "Pengiriman email gagal.");
    }
    return;
  }

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP belum di-set.");
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject,
    text,
    html,
    replyTo,
  });
};
