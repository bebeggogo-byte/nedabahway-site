/**
 * POST /api/wall/og
 * 주어진 URL을 서버에서 fetch 하여 Open Graph 메타데이터를 추출.
 *
 * body: { url }
 * - http/https URL만 허용
 * - og:title / og:image / og:description 추출, 없으면 <title> 폴백
 * - 5초 타임아웃, 응답 본문은 앞부분만 읽어 파싱 (경량 정규식)
 * - 응답: { title, image, description }  (각 항목은 없으면 null)
 */
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 512 * 1024; // head 영역만 보면 충분 — 512KB 상한

const bodySchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (u) => {
        try {
          const p = new URL(u).protocol;
          return p === "http:" || p === "https:";
        } catch {
          return false;
        }
      },
      { message: "http/https URL만 허용됩니다." },
    ),
});

/** <meta property|name="key" content="..."> 에서 content 추출 (속성 순서 무관) */
function extractMeta(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // property/name 이 key 인 meta 태그를 찾고, 같은 태그 안의 content 값을 캡처
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*?content\\s*=\\s*["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*?(?:property|name)\\s*=\\s*["']${escaped}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

/** <title> 텍스트 추출 */
function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m && m[1] ? decodeEntities(m[1].trim()) : null;
}

/** 자주 쓰이는 HTML 엔티티만 디코드 (경량) */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** 상대 경로 og:image 를 절대 URL로 보정 */
function absolutize(image: string | null, baseUrl: string): string | null {
  if (!image) return null;
  try {
    return new URL(image, baseUrl).toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_url", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { url } = parsed.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // 일부 사이트가 봇 차단 — 일반 UA 흉내
        "user-agent":
          "Mozilla/5.0 (compatible; NedabahBot/1.0; +https://nedabah.kr)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "fetch_failed", status: res.status },
        { status: 502 },
      );
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      // HTML 이 아니면 메타 추출 불가 — 빈 결과 반환
      return NextResponse.json({ title: null, image: null, description: null });
    }
    html = (await res.text()).slice(0, MAX_HTML_BYTES);
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "timeout" : "fetch_error" },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }

  const title = extractMeta(html, "og:title") ?? extractTitle(html);
  const image = absolutize(extractMeta(html, "og:image"), url);
  const description =
    extractMeta(html, "og:description") ?? extractMeta(html, "description");

  return NextResponse.json({ title, image, description });
}
