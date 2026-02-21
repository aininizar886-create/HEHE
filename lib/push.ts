import "server-only";

import webpush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const contact = process.env.VAPID_SUBJECT ?? process.env.EMAIL_FROM ?? "mailto:admin@example.com";

if (publicKey && privateKey) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
}

export const sendPushNotification = async (
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
) => {
  if (!publicKey || !privateKey) {
    throw new Error("VAPID belum di-set.");
  }

  const data = JSON.stringify(payload);
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    data
  );
};
