/**
 * 단순 인메모리 IP 기반 rate limiter.
 * 외부 KV 없이 동작 — Supabase 무료 티어 / 단일 인스턴스 가정.
 *
 * 한계: 인스턴스가 여러 개로 스케일되면 인스턴스마다 카운터가 분리된다.
 *       walls 기능 규모에서는 허용 가능. 대규모 트래픽 시 KV로 교체 필요.
 */

const WINDOW_MS = 60_000; // 60초 윈도우
const MAX_HITS = 10; // 윈도우당 최대 10회

/** ip → 윈도우 내 요청 타임스탬프 배열 */
const hits = new Map<string, number[]>();

/**
 * 요청 IP를 헤더에서 추출. x-forwarded-for 의 첫 IP 사용.
 * 추출 불가 시 "unknown" 으로 묶임.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0];
    if (first && first.trim()) return first.trim();
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * rate limit 검사 + 기록.
 * 허용되면 true, 초과면 false 반환.
 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}
