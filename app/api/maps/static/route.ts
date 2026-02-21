import { NextResponse } from "next/server";

const FALLBACK_SVG = (label: string) => {
  const safe = label.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">` +
    `<rect width="100%" height="100%" fill="#0f172a"/>` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#cbd5f5" font-family="ui-sans-serif, system-ui" font-size="18">${safe}</text>` +
    `</svg>`;
};

const buildStaticMapUrl = (lat: number, lon: number, host: string) => {
  const marker = encodeURIComponent(`${lat},${lon},red-pushpin`);
  return `https://${host}/staticmap.php?center=${lat},${lon}&zoom=16&size=640x360&markers=${marker}`;
};

const buildYandexStaticMapUrl = (lat: number, lon: number) =>
  `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&size=640,360&z=15&l=map&pt=${lon},${lat},pm2rdm`;

const fetchRemote = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "image/*",
    },
    next: { revalidate: 60 * 60 },
  });
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/png";
  return { buffer, contentType };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number.parseFloat(url.searchParams.get("lat") || "");
  const lon = Number.parseFloat(url.searchParams.get("lon") || "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return new NextResponse(FALLBACK_SVG("Koordinat tidak valid"), {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }

  const sources = [
    buildStaticMapUrl(lat, lon, "staticmap.openstreetmap.fr"),
    buildYandexStaticMapUrl(lat, lon),
    buildStaticMapUrl(lat, lon, "staticmap.openstreetmap.de"),
  ];

  for (const source of sources) {
    try {
      const result = await fetchRemote(source);
      if (result) {
        return new NextResponse(result.buffer, {
          headers: {
            "Content-Type": result.contentType,
            "Cache-Control": "public, max-age=21600",
          },
        });
      }
    } catch {
      // try next source
    }
  }

  return new NextResponse(FALLBACK_SVG("Preview lokasi gagal dimuat"), {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
