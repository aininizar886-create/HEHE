import { NextResponse } from "next/server";

const DEFAULT_CITY = {
  id: "58a2fc6ed39fd083f55d4182bf88826d",
  name: "KOTA JAKARTA",
};

const parseCityKeyword = (label: string | undefined) => {
  if (!label) return "";
  const cleaned = label
    .replace(/(kota|kabupaten|kab\.|kab)\s+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || label.trim();
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ city: DEFAULT_CITY, fallback: true });
  }

  try {
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`,
      {
        headers: {
          "User-Agent": "melpin-app/1.0 (calendar resolver)",
        },
        next: { revalidate: 60 * 60 * 24 },
      }
    );

    const geoPayload = (await geoResponse.json()) as {
      address?: { city?: string; town?: string; village?: string; county?: string; state?: string };
    };
    const nameCandidate =
      geoPayload.address?.city ||
      geoPayload.address?.town ||
      geoPayload.address?.village ||
      geoPayload.address?.county ||
      geoPayload.address?.state;

    if (!nameCandidate) {
      return NextResponse.json({ city: DEFAULT_CITY, fallback: true });
    }

    const keyword = parseCityKeyword(nameCandidate);
    const searchResponse = await fetch(
      `https://api.myquran.com/v3/sholat/kota/cari/${encodeURIComponent(keyword)}`,
      { next: { revalidate: 60 * 60 * 6 } }
    );
    const searchPayload = (await searchResponse.json()) as {
      status: boolean;
      data?: Array<{ id: string; lokasi: string }>;
    };

    if (!searchPayload.status || !Array.isArray(searchPayload.data) || searchPayload.data.length === 0) {
      return NextResponse.json({ city: DEFAULT_CITY, fallback: true });
    }

    const city = searchPayload.data[0];
    return NextResponse.json({
      city: { id: city.id, name: city.lokasi },
      fallback: false,
    });
  } catch {
    return NextResponse.json({ city: DEFAULT_CITY, fallback: true });
  }
}
