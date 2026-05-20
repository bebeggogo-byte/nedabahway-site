/**
 * POST /api/wall/cards
 * 익명(로그인 없이) 카드 생성.
 *
 * body: { wallSlug? , wallId? , kind, title?, body?, author_name,
 *         color?, media_url?, media_name?, media_size?, link_url?, link_meta? }
 *
 * - wallSlug 또는 wallId 중 하나로 대상 wall 식별
 * - anon 서버 클라이언트 사용 → cards INSERT RLS가 lock 규칙(contributions_locked)을 강제
 * - 인메모리 per-IP rate limit (60초당 10회)
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { insertCard } from "@/server/walls/queries";
import { clientIp, checkRateLimit } from "@/server/walls/rate-limit";
import type { CardInsert, Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z
  .object({
    wallSlug: z.string().trim().min(1).max(64).optional(),
    wallId: z.string().uuid().optional(),
    kind: z.enum(["text", "image", "file", "link"]),
    title: z.string().trim().max(200).optional(),
    body: z.string().trim().max(5000).optional(),
    author_name: z.string().trim().min(1).max(60),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "color는 #rrggbb 형식이어야 합니다")
      .optional(),
    media_url: z.string().url().max(2000).optional(),
    media_name: z.string().trim().max(255).optional(),
    media_size: z.number().int().nonnegative().optional(),
    link_url: z.string().url().max(2000).optional(),
    link_meta: z.record(z.unknown()).optional(),
    sort_order: z.number().optional(),
  })
  .refine((v) => v.wallSlug || v.wallId, {
    message: "wallSlug 또는 wallId가 필요합니다.",
  });

export async function POST(req: NextRequest) {
  if (!env.supabase.isConfigured) {
    return NextResponse.json({ error: "Supabase 설정 누락" }, { status: 500 });
  }

  // rate limit
  const ip = clientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주십시오." },
      { status: 429 },
    );
  }

  // body 파싱·검증
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // anon 서버 클라이언트 — RLS가 lock·존재 검사를 담당
  const db = await createClient();

  // 대상 wall 확인 (slug면 id 변환, lock 여부 사전 점검 → 명확한 에러 메시지)
  const wallQuery = db.from("walls").select("id, contributions_locked");
  const { data: wall } = input.wallId
    ? await wallQuery.eq("id", input.wallId).maybeSingle()
    : await wallQuery.eq("slug", input.wallSlug as string).maybeSingle();

  if (!wall) {
    return NextResponse.json({ error: "wall_not_found" }, { status: 404 });
  }
  if (wall.contributions_locked) {
    return NextResponse.json(
      { error: "wall_locked", message: "이 보드는 현재 카드 추가가 잠겨 있습니다." },
      { status: 403 },
    );
  }

  const payload: CardInsert = {
    wall_id: wall.id,
    kind: input.kind,
    title: input.title ?? null,
    body: input.body ?? null,
    author_name: input.author_name,
    color: input.color ?? null,
    media_url: input.media_url ?? null,
    media_name: input.media_name ?? null,
    media_size: input.media_size ?? null,
    link_url: input.link_url ?? null,
    link_meta: (input.link_meta ?? null) as Json | null,
    sort_order: input.sort_order ?? Date.now(),
  };

  const card = await insertCard(db, payload);
  if (!card) {
    // RLS 거부(잠금 등)나 기타 오류
    return NextResponse.json({ error: "card_insert_failed" }, { status: 400 });
  }

  return NextResponse.json({ card }, { status: 201 });
}
