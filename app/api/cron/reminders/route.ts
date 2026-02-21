import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendPushNotification } from "@/lib/push";

const DEFAULT_CITY = {
  id: "58a2fc6ed39fd083f55d4182bf88826d",
  name: "KOTA JAKARTA",
};
const DEFAULT_TIMEZONE = "Asia/Jakarta";

const HOLIDAY_TTL_MS = 1000 * 60 * 60 * 12;
const holidayCache = new Map<number, { data: Array<{ date: string; name: string }>; fetchedAt: number }>();

const getBaseUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

const getTimeParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { year, month, day, hour, minute, dateKey, minutes: hour * 60 + minute };
};

const parseMinutes = (time?: string) => {
  if (!time) return null;
  const [hh, mm] = time.split(":").map((part) => Number(part));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
};

const isWithinRange = (nowMinutes: number, target: number, before: number, after: number) =>
  nowMinutes >= target - before && nowMinutes <= target + after;

const fetchHolidays = async (year: number) => {
  const cached = holidayCache.get(year);
  if (cached && Date.now() - cached.fetchedAt < HOLIDAY_TTL_MS) {
    return cached.data;
  }
  const response = await fetch(`https://libur.deno.dev/api?year=${year}`);
  if (!response.ok) return [];
  const data = (await response.json()) as Array<{ date: string; name: string }>;
  if (!Array.isArray(data)) return [];
  holidayCache.set(year, { data, fetchedAt: Date.now() });
  return data;
};

const fetchPrayerSchedule = async (cityId: string) => {
  const response = await fetch(`https://api.myquran.com/v3/sholat/jadwal/${cityId}/today`);
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    status: boolean;
    data?: { id: string; kabko: string; jadwal: Record<string, Record<string, string>> };
  };
  if (!payload.status || !payload.data?.jadwal) return null;
  const [dateKey, times] = Object.entries(payload.data.jadwal)[0] ?? [];
  if (!dateKey || !times) return null;
  return { dateKey, times, cityName: payload.data.kabko || DEFAULT_CITY.name };
};

const isRamadanDate = (dateKey: string, timeZone: string) => {
  const date = new Date(`${dateKey}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
    month: "numeric",
    timeZone,
  }).formatToParts(date);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  return month === 9;
};

const handleCron = async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("x-cron-secret");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const reminders = await prisma.reminder.findMany({
    where: {
      notified: false,
      done: false,
      scheduledAt: { lte: now },
    },
  });

  const results = await Promise.all(
    reminders.map(async (reminder) => {
      const subs = await prisma.pushSubscription.findMany({
        where: { userId: reminder.userId },
      });

      const payload = {
        title: "PENGINGAT",
        body: reminder.text,
        url: `${getBaseUrl()}/?reminder=${reminder.id}`,
      };

      const sendResults = await Promise.all(
        subs.map(async (sub) => {
          try {
            await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              payload
            );
            return { ok: true };
          } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
            return { ok: false };
          }
        })
      );

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { notified: true },
      });

      return { reminderId: reminder.id, delivered: sendResults.filter((item) => item.ok).length };
    })
  );

  const subs = await prisma.pushSubscription.findMany({
    include: { user: { include: { profile: true } } },
  });

  const users = new Map<
    string,
    {
      profile?: {
        prayerCityId?: string | null;
        prayerCityName?: string | null;
        timezone?: string | null;
      };
      subs: typeof subs;
    }
  >();
  subs.forEach((sub) => {
    const entry = users.get(sub.userId) ?? { profile: sub.user.profile ?? undefined, subs: [] as typeof subs };
    entry.subs.push(sub);
    entry.profile = sub.user.profile ?? entry.profile;
    users.set(sub.userId, entry);
  });

  const cityIds = new Set<string>();
  users.forEach((entry) => {
    const cityId = entry.profile?.prayerCityId ?? DEFAULT_CITY.id;
    cityIds.add(cityId);
  });

  const citySchedules = new Map<string, { dateKey: string; times: Record<string, string>; cityName: string }>();
  await Promise.all(
    Array.from(cityIds).map(async (cityId) => {
      const schedule = await fetchPrayerSchedule(cityId);
      if (schedule) citySchedules.set(cityId, schedule);
    })
  );

  const calendarResults: Array<{ userId: string; kind: string; delivered: number }> = [];
  const userTimeInfo = new Map<
    string,
    { timeZone: string; dateKey: string; minutes: number; year: number }
  >();
  users.forEach((entry, userId) => {
    const timeZone = entry.profile?.timezone ?? DEFAULT_TIMEZONE;
    const parts = getTimeParts(now, timeZone);
    userTimeInfo.set(userId, {
      timeZone,
      dateKey: parts.dateKey,
      minutes: parts.minutes,
      year: parts.year,
    });
  });
  const dateKeys = Array.from(new Set(Array.from(userTimeInfo.values()).map((item) => item.dateKey)));
  const existing = await prisma.calendarNotification.findMany({
    where: {
      date: { in: dateKeys },
      kind: { in: ["sahur-0330", "sahur-0415", "buka", "holiday"] },
    },
  });
  const sentMap = new Map<string, Set<string>>();
  existing.forEach((item) => {
    const set = sentMap.get(item.userId) ?? new Set<string>();
    set.add(`${item.date}:${item.kind}`);
    sentMap.set(item.userId, set);
  });

  for (const [userId, entry] of users.entries()) {
    const cityId = entry.profile?.prayerCityId ?? DEFAULT_CITY.id;
    const schedule = citySchedules.get(cityId);
    if (!schedule) continue;

    const userNow = userTimeInfo.get(userId);
    if (!userNow) continue;
    const holidayList = await fetchHolidays(userNow.year);
    const holidayToday = holidayList.find((item) => item.date === userNow.dateKey);
    const isRamadan = isRamadanDate(userNow.dateKey, userNow.timeZone);
    const already = sentMap.get(userId) ?? new Set<string>();
    const hasSent = (kind: string) => already.has(`${userNow.dateKey}:${kind}`);

    const deliver = async (kind: string, body: string) => {
      if (hasSent(kind)) return;
      const payload = { title: "PENGINGAT", body, url: `${getBaseUrl()}?calendar=${userNow.dateKey}` };
      const sendResults = await Promise.all(
        entry.subs.map(async (sub) => {
          try {
            await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              payload
            );
            return { ok: true };
          } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
            return { ok: false };
          }
        })
      );

      const delivered = sendResults.filter((item) => item.ok).length;
      if (delivered > 0) {
        await prisma.calendarNotification.create({
          data: { userId, date: userNow.dateKey, kind },
        });
        calendarResults.push({ userId, kind, delivered });
      }
    };

    if (isRamadan) {
      if (isWithinRange(userNow.minutes, 3 * 60 + 30, 5, 8)) {
        await deliver("sahur-0330", `Waktunya sahur! Imsak jam ${schedule.times.imsak ?? "--"}.`);
      }
      if (isWithinRange(userNow.minutes, 4 * 60 + 15, 5, 8)) {
        await deliver("sahur-0415", `Sahur terakhir ya! Imsak jam ${schedule.times.imsak ?? "--"}.`);
      }
      const maghribMinutes = parseMinutes(schedule.times.maghrib);
      if (maghribMinutes && isWithinRange(userNow.minutes, maghribMinutes, 5, 20)) {
        await deliver("buka", `Maghrib jam ${schedule.times.maghrib ?? "--"}.`);
      }
    }

    if (holidayToday && userNow.minutes >= 7 * 60) {
      await deliver("holiday", `Hari ini libur ${holidayToday.name}.`);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    calendarDelivered: calendarResults.length,
    results,
    calendarResults,
  });
};

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
