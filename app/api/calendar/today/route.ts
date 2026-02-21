import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type HolidayItem = { date: string; name: string };

const DEFAULT_CITY = {
  id: "58a2fc6ed39fd083f55d4182bf88826d",
  name: "KOTA JAKARTA",
};

const HOLIDAY_TTL_MS = 1000 * 60 * 60 * 12;
const holidayCache = new Map<number, { data: HolidayItem[]; fetchedAt: number }>();

const fetchHolidays = async (year: number) => {
  const cached = holidayCache.get(year);
  if (cached && Date.now() - cached.fetchedAt < HOLIDAY_TTL_MS) {
    return cached.data;
  }

  const response = await fetch(`https://libur.deno.dev/api?year=${year}`, {
    next: { revalidate: 60 * 60 * 6 },
  });
  if (!response.ok) return [];
  const data = (await response.json()) as HolidayItem[];
  if (!Array.isArray(data)) return [];
  holidayCache.set(year, { data, fetchedAt: Date.now() });
  return data;
};

const fetchPrayerSchedule = async (cityId: string) => {
  const response = await fetch(`https://api.myquran.com/v3/sholat/jadwal/${cityId}/today`, {
    next: { revalidate: 60 * 10 },
  });
  if (!response.ok) return null;
  return (await response.json()) as {
    status: boolean;
    data?: {
      id: string;
      kabko: string;
      prov: string;
      jadwal: Record<string, Record<string, string>>;
    };
  };
};

const RAMADAN_START_DATE = process.env.RAMADAN_START_DATE;
const RAMADAN_DAYS = Number(process.env.RAMADAN_DAYS ?? "30");

const getHijriParts = (dateKey: string, timeZone: string) => {
  const baseDate = new Date(`${dateKey}T00:00:00+07:00`);
  if (Number.isNaN(baseDate.getTime())) return null;
  const numericFormatter = new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone,
  });
  const parts = numericFormatter.formatToParts(baseDate);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "");
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "");
  const era = parts.find((part) => part.type === "era")?.value ?? "";
  if (!day || !month || !year) return null;

  const monthName = new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
    month: "long",
    timeZone,
  }).format(baseDate);

  return { day, month, monthName, year, era };
};

const toUtcDay = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map((item) => Number(item));
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
};

const getGovernmentRamadanDay = (dateKey: string) => {
  if (!RAMADAN_START_DATE) return null;
  const start = toUtcDay(RAMADAN_START_DATE);
  const current = toUtcDay(dateKey);
  if (start === null || current === null) return null;
  const diffDays = Math.floor((current - start) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays < 1 || diffDays > RAMADAN_DAYS) return null;
  return diffDays;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cityIdParam = url.searchParams.get("cityId") || undefined;
  const cityNameParam = url.searchParams.get("cityName") || undefined;
  const timeZoneParam = url.searchParams.get("timezone") || undefined;

  const user = await getSessionUser();
  const profile = user
    ? await prisma.profile.findUnique({ where: { userId: user.id } })
    : null;

  const cityId = cityIdParam || profile?.prayerCityId || DEFAULT_CITY.id;
  const preferredCityName = cityNameParam || profile?.prayerCityName || DEFAULT_CITY.name;
  const timeZone = timeZoneParam || profile?.timezone || "Asia/Jakarta";

  let prayerPayload = await fetchPrayerSchedule(cityId);
  if (!prayerPayload?.status && cityId !== DEFAULT_CITY.id) {
    prayerPayload = await fetchPrayerSchedule(DEFAULT_CITY.id);
  }

  if (!prayerPayload?.status || !prayerPayload.data?.jadwal) {
    return NextResponse.json({ error: "Jadwal sholat belum tersedia." }, { status: 502 });
  }

  const scheduleEntries = Object.entries(prayerPayload.data.jadwal);
  const [dateKey, times] = scheduleEntries[0] ?? [];
  if (!dateKey || !times) {
    return NextResponse.json({ error: "Jadwal sholat kosong." }, { status: 502 });
  }

  const holidayYear = Number(dateKey.slice(0, 4));
  const holidays = await fetchHolidays(holidayYear);
  const holiday = holidays.find((item) => item.date === dateKey) ?? null;

  const hijri = getHijriParts(dateKey, timeZone);
  const governmentDay = getGovernmentRamadanDay(dateKey);
  const isRamadan = typeof governmentDay === "number" ? true : hijri?.month === 9;
  const ramadanDay = typeof governmentDay === "number" ? governmentDay : isRamadan ? hijri?.day : undefined;
  const ramadanSource = typeof governmentDay === "number" ? "government" : "hijri";

  return NextResponse.json({
    date: dateKey,
    timezone: timeZone,
    holiday: holiday ? { name: holiday.name } : null,
    hijri,
    ramadan: { isRamadan, day: ramadanDay, source: ramadanSource },
    prayer: {
      cityId: prayerPayload.data.id,
      cityName: prayerPayload.data.kabko || preferredCityName,
      imsak: times.imsak,
      subuh: times.subuh,
      terbit: times.terbit,
      dhuha: times.dhuha,
      dzuhur: times.dzuhur,
      ashar: times.ashar,
      maghrib: times.maghrib,
      isya: times.isya,
    },
  });
}
