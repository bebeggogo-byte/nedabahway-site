/**
 * walls / cards 서버 쿼리 헬퍼.
 * 페이지(Server Component)와 Route Handler 양쪽에서 사용.
 *
 * 클라이언트 인스턴스화 금지 — 항상 lib/supabase/server 의 createClient/createAdminClient 재사용.
 */
import { createClient } from "@/lib/supabase/server";
import type {
  WallRow,
  WallInsert,
  WallUpdate,
  CardRow,
  CardInsert,
} from "@/types/database";

/**
 * 서버 Supabase 클라이언트 타입.
 * 손수 작성한 `SupabaseClient<Database>` 대신 실제 팩토리(createClient) 반환 타입을
 * 그대로 사용한다 — supabase-js 버전별 제네릭 추론 차이를 흡수하기 위함.
 */
export type Db = Awaited<ReturnType<typeof createClient>>;

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // 헷갈리는 0/o/1/l 제외
const SLUG_LENGTH = 8;
const SLUG_MAX_RETRY = 5;

/** 짧고 사람이 읽을 수 있는 소문자 영숫자 slug 생성 */
function randomSlug(): string {
  let out = "";
  for (let i = 0; i < SLUG_LENGTH; i += 1) {
    const idx = Math.floor(Math.random() * SLUG_ALPHABET.length);
    out += SLUG_ALPHABET.charAt(idx);
  }
  return out;
}

/**
 * 충돌 없는 unique slug 생성.
 * 이미 존재하는 slug면 재시도(최대 SLUG_MAX_RETRY회).
 */
export async function generateUniqueSlug(db: Db): Promise<string> {
  for (let attempt = 0; attempt < SLUG_MAX_RETRY; attempt += 1) {
    const candidate = randomSlug();
    const { data } = await db
      .from("walls")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  // 극히 드문 경우: 타임스탬프 접미사로 보장
  return `${randomSlug()}${Date.now().toString(36).slice(-4)}`;
}

/** slug로 wall 단건 조회 (없으면 null) */
export async function getWallBySlug(slug: string): Promise<WallRow | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("walls")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[walls] getWallBySlug 실패", error);
    return null;
  }
  return data ?? null;
}

/** owner의 wall 목록 (대시보드용, 최신순) */
export async function listWallsByOwner(ownerId: string): Promise<WallRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("walls")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[walls] listWallsByOwner 실패", error);
    return [];
  }
  return data ?? [];
}

/** wall의 카드 목록 (sort_order → created_at 순) */
export async function listCards(wallId: string): Promise<CardRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("cards")
    .select("*")
    .eq("wall_id", wallId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[walls] listCards 실패", error);
    return [];
  }
  return data ?? [];
}

/** wall 생성 — owner 작업. slug는 호출 측에서 미지정 시 자동 생성 */
export async function createWall(
  input: Omit<WallInsert, "slug"> & { slug?: string },
): Promise<WallRow | null> {
  const db = await createClient();
  const slug = input.slug ?? (await generateUniqueSlug(db));
  const payload: WallInsert = { ...input, slug };
  const { data, error } = await db
    .from("walls")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    console.error("[walls] createWall 실패", error);
    return null;
  }
  return data;
}

/** wall 수정 — owner 작업 (RLS가 소유권 강제) */
export async function updateWall(
  wallId: string,
  patch: WallUpdate,
): Promise<WallRow | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("walls")
    .update(patch)
    .eq("id", wallId)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[walls] updateWall 실패", error);
    return null;
  }
  return data ?? null;
}

/** wall 삭제 — owner 작업 (RLS가 소유권 강제) */
export async function deleteWall(wallId: string): Promise<boolean> {
  const db = await createClient();
  const { error } = await db.from("walls").delete().eq("id", wallId);
  if (error) {
    console.error("[walls] deleteWall 실패", error);
    return false;
  }
  return true;
}

/**
 * 카드 삽입.
 * 익명 게스트 작성 경로에서 사용 — 전달된 db 클라이언트의 RLS가 lock 규칙을 강제한다.
 * (anon 서버 클라이언트를 넘기면 contributions_locked=true wall은 INSERT 거부됨)
 */
export async function insertCard(
  db: Db,
  input: CardInsert,
): Promise<CardRow | null> {
  const { data, error } = await db
    .from("cards")
    .insert(input)
    .select("*")
    .single();
  if (error) {
    console.error("[walls] insertCard 실패", error);
    return null;
  }
  return data;
}

/** 카드 삭제 — owner 작업 (RLS가 소유권 강제) */
export async function deleteCard(db: Db, cardId: string): Promise<boolean> {
  const { error } = await db.from("cards").delete().eq("id", cardId);
  if (error) {
    console.error("[walls] deleteCard 실패", error);
    return false;
  }
  return true;
}
