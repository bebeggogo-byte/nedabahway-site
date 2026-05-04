/**
 * 매일 03:00 KST 실행 (vercel cron).
 * 새 worksheet_responses → Voyage AI 임베딩 → case_embeddings 저장.
 *
 * Voyage 키 미설정 시 즉시 종료.
 */

const VOYAGE_KEY = process.env.VOYAGE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!VOYAGE_KEY) {
  console.log("[embed-responses] VOYAGE_API_KEY 미설정 — 즉시 종료.");
  process.exit(0);
}
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[embed-responses] Supabase 키 미설정.");
  process.exit(1);
}

// TODO: implement when VOYAGE_API_KEY is set
console.log("[embed-responses] STUB — 실제 임베딩은 다음 PR에서 구현.");
