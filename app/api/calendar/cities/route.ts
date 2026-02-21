import { NextResponse } from "next/server";

type PrayerCity = { id: string; lokasi: string };

const CITIES_TTL_MS = 1000 * 60 * 60 * 24 * 7;
let cachedCities: { data: PrayerCity[]; fetchedAt: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (cachedCities && now - cachedCities.fetchedAt < CITIES_TTL_MS) {
    return NextResponse.json({ cities: cachedCities.data });
  }

  const response = await fetch("https://api.myquran.com/v3/sholat/kota/semua", {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!response.ok) {
    return NextResponse.json({ error: "Gagal memuat kota." }, { status: 502 });
  }

  const payload = (await response.json()) as { status: boolean; data?: PrayerCity[] };
  if (!payload.status || !Array.isArray(payload.data)) {
    return NextResponse.json({ error: "Data kota tidak tersedia." }, { status: 502 });
  }

  cachedCities = { data: payload.data, fetchedAt: now };
  return NextResponse.json({ cities: payload.data });
}
