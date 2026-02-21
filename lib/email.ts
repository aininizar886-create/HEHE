import "server-only";

import nodemailer from "nodemailer";

const smtpHost = (process.env.SMTP_HOST ?? "").trim();
const smtpPort = Number((process.env.SMTP_PORT ?? "465").trim());
const smtpUser = (process.env.SMTP_USER ?? "").trim();
const smtpPass = (process.env.SMTP_PASS ?? "").trim();
const emailFrom = (process.env.EMAIL_FROM ?? "").trim();
const mailWorkerUrl = (process.env.MAIL_WORKER_URL ?? "").trim();
const mailWorkerToken = (process.env.MAIL_WORKER_TOKEN ?? "").trim();
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

type NotificationEmail = {
  to: string;
  subject: string;
  title: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
};

const renderNotificationEmail = ({
  title,
  message,
  ctaText,
  ctaUrl,
  footerNote,
}: NotificationEmail) => {
  const safeMessage = message.replace(/\n/g, "<br />");
  const ctaBlock =
    ctaText && ctaUrl
      ? `<a href="${ctaUrl}" style="display:inline-block;padding:12px 18px;background:#55b4ff;color:#0b1220;text-decoration:none;border-radius:999px;font-weight:700">${ctaText}</a>`
      : "";
  const footer = footerNote
    ? `<p style="margin:18px 0 0;font-size:12px;color:#7b879a">${footerNote}</p>`
    : "";
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:24px;background:#0b1220;color:#e6edf3;font-family:Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;border-radius:20px;background:#101a2d;padding:24px;">
        <tr>
          <td>
            <p style="margin:0 0 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#93a4c1;">Melpin</p>
            <h2 style="margin:0 0 12px;font-size:22px;color:#f6f8fb;">${title}</h2>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#c8d3e2;">${safeMessage}</p>
            ${ctaBlock ? `<div style="margin:18px 0 8px;">${ctaBlock}</div>` : ""}
            ${footer}
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

const ensureTransporter = () => {
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP belum di-set.");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
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

  const transporter = ensureTransporter();

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject,
    text,
    html,
    replyTo,
  });
};

export const sendNotificationEmail = async ({
  to,
  subject,
  title,
  message,
  ctaText,
  ctaUrl,
  footerNote,
}: NotificationEmail) => {
  const fromAddress = resolveFromAddress();
  if (!fromAddress || !fromAddress.includes("@")) {
    throw new Error("Alamat pengirim email belum di-set.");
  }

  const html = renderNotificationEmail({
    to,
    subject,
    title,
    message,
    ctaText,
    ctaUrl,
    footerNote,
  });
  const text = `${title}\n\n${message}${ctaText && ctaUrl ? `\n\n${ctaText}: ${ctaUrl}` : ""}`;
  const replyTo = emailFrom && emailFrom !== fromAddress ? emailFrom : undefined;

  if (mailWorkerUrl && mailWorkerToken) {
    const response = await fetch(mailWorkerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mailWorkerToken}`,
      },
      body: JSON.stringify({
        to,
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

  const transporter = ensureTransporter();
  await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html,
    replyTo,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/?reset=${token}`;
  await sendNotificationEmail({
    to: email,
    subject: "Reset Password Melpin",
    title: "Reset Password",
    message:
      "Kamu minta reset password. Klik tombol di bawah untuk atur password baru. Link berlaku 20 menit.",
    ctaText: "Atur Password",
    ctaUrl: resetUrl,
    footerNote: `Kalau kamu tidak merasa minta reset, abaikan email ini. ${resetUrl}`,
  });
};
