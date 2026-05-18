-- ============================================================
-- 0007_walls.sql — Padlet 스타일 협업 보드 (walls + cards)
-- 작성: 2026-05-18
-- 핵심: wall은 slug로 공개 조회, 익명 사용자가 카드 추가 가능
--       owner(인증 사용자)만 wall 생성·수정, 자기 wall의 카드 삭제 가능
-- ============================================================

-- ============================================================
-- walls — 협업 보드 (owner = auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS walls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout text NOT NULL DEFAULT 'masonry',
  cover_color text DEFAULT '#f5f5f4',
  contributions_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_walls_slug ON walls(slug);
CREATE INDEX IF NOT EXISTS idx_walls_owner ON walls(owner_id);

-- ============================================================
-- cards — 보드 위 카드 (text·image·file·link)
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wall_id uuid NOT NULL REFERENCES walls(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('text', 'image', 'file', 'link')),
  title text,
  body text,
  author_name text,
  color text DEFAULT '#ffffff',
  media_url text,
  media_name text,
  media_size bigint,
  link_url text,
  link_meta jsonb,
  sort_order double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cards_wall ON cards(wall_id);

-- ============================================================
-- updated_at 자동 갱신 트리거 (0001의 set_updated_at 재사용)
-- ============================================================
DO $$ BEGIN
  CREATE TRIGGER trg_walls_updated BEFORE UPDATE ON walls FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- RLS — walls / cards
-- ============================================================
ALTER TABLE walls ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- walls SELECT: 모두(익명 포함) — 공개 보드
DROP POLICY IF EXISTS "walls_select_all" ON walls;
CREATE POLICY "walls_select_all" ON walls FOR SELECT USING (true);

-- walls INSERT: 인증 사용자만, 본인이 owner
DROP POLICY IF EXISTS "walls_insert_owner" ON walls;
CREATE POLICY "walls_insert_owner" ON walls FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- walls UPDATE: owner 본인만
DROP POLICY IF EXISTS "walls_update_owner" ON walls;
CREATE POLICY "walls_update_owner" ON walls FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- walls DELETE: owner 본인만
DROP POLICY IF EXISTS "walls_delete_owner" ON walls;
CREATE POLICY "walls_delete_owner" ON walls FOR DELETE
  USING (owner_id = auth.uid());

-- cards SELECT: 모두(익명 포함)
DROP POLICY IF EXISTS "cards_select_all" ON cards;
CREATE POLICY "cards_select_all" ON cards FOR SELECT USING (true);

-- cards INSERT: 익명 + 인증 모두 가능, 단 대상 wall이 존재하고 잠겨있지 않을 때만
DROP POLICY IF EXISTS "cards_insert_unlocked" ON cards;
CREATE POLICY "cards_insert_unlocked" ON cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM walls w
      WHERE w.id = wall_id AND w.contributions_locked = false
    )
  );

-- cards UPDATE: 해당 wall의 owner만
DROP POLICY IF EXISTS "cards_update_owner" ON cards;
CREATE POLICY "cards_update_owner" ON cards FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM walls w WHERE w.id = cards.wall_id AND w.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM walls w WHERE w.id = cards.wall_id AND w.owner_id = auth.uid())
  );

-- cards DELETE: 해당 wall의 owner만
DROP POLICY IF EXISTS "cards_delete_owner" ON cards;
CREATE POLICY "cards_delete_owner" ON cards FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM walls w WHERE w.id = cards.wall_id AND w.owner_id = auth.uid())
  );

-- ============================================================
-- Storage — wall-media 버킷 (public read)
-- 게스트 업로드는 service_role 클라이언트(API 라우트)를 거치므로
-- storage.objects 에 anon INSERT 정책을 따로 두지 않음 (service_role는 RLS 우회).
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('wall-media', 'wall-media', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 끝.
-- ============================================================
