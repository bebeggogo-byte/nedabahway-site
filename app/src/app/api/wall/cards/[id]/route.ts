/**
 * DELETE /api/wall/cards/[id]
 * owner가 자기 wall의 카드를 삭제.
 *
 * - 인증 서버 클라이언트 사용 → cards DELETE RLS가 소유권을 강제
 * - 미인증: 401
 * - 인증됐지만 소유 wall이 아님 / 카드 없음: RLS가 빈 결과를 반환 → 404
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().uuid();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!env.supabase.isConfigured) {
    return NextResponse.json({ error: "Supabase 설정 누락" }, { status: 500 });
  }

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "invalid_card_id" }, { status: 400 });
  }

  // 인증 서버 클라이언트 — 로그인 세션이 있어야 RLS가 소유권 검사 통과
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // RLS: cards_delete_owner 정책이 wall.owner_id = auth.uid() 인 카드만 허용.
  // 소유 카드가 아니면 0행 삭제 → 404 로 응답.
  const { data, error } = await db
    .from("cards")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[walls] DELETE card 실패", error);
    return NextResponse.json({ error: "card_delete_failed" }, { status: 400 });
  }
  if (!data || data.length === 0) {
    // 카드가 없거나, 본인 소유 wall의 카드가 아님 (RLS가 가림)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id });
}
