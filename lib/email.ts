import "server-only";

import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST ?? "";
const smtpPort = Number(process.env.SMTP_PORT ?? "465");
const smtpUser = process.env.SMTP_USER ?? "";
const smtpPass = process.env.SMTP_PASS ?? "";
const emailFrom = process.env.EMAIL_FROM ?? "no-reply@localhost";

const getBaseUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export const sendMagicLinkEmail = async (email: string, token: string) => {
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

  await transporter.sendMail({
    from: emailFrom,
    to: email,
    subject,
    text,
    html,
  });
};
