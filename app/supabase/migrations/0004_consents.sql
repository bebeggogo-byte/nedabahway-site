-- ============================================================
-- 0004_consents.sql — 결제·가입 시 약관 동의 기록
--
-- 전자상거래법 + PIPA 22조 (만 14세 미만 보호자 동의) 대응.
-- 약관 버전을 함께 기록하여 추후 약관 개정 시 어떤 버전에
-- 동의했는지 추적 가능.
-- ============================================================

CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,

  -- 약관 버전 (시행일을 ISO date 문자열로)
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  refund_version text NOT NULL,

  -- 동의 종류
  parental boolean NOT NULL DEFAULT false,         -- 만 14세 미만 보호자 동의
  marketing boolean NOT NULL DEFAULT false,        -- 마케팅 정보 수신
  age_over_14 boolean NOT NULL DEFAULT true,       -- 만 14세 이상 자체 확인

  -- 컨텍스트
  ip text,
  user_agent text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_enrollment ON consents(enrollment_id);

-- RLS
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consents_select_self" ON consents;
CREATE POLICY "consents_select_self" ON consents FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "consents_insert_self" ON consents;
CREATE POLICY "consents_insert_self" ON consents FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 동의 기록은 변경·삭제 금지 (감사 무결성)
-- UPDATE, DELETE는 service_role(서버) 또는 system_admin만
DROP POLICY IF EXISTS "consents_admin_only" ON consents;
CREATE POLICY "consents_admin_only" ON consents FOR ALL
  USING (is_system_admin(auth.uid()))
  WITH CHECK (is_system_admin(auth.uid()));

COMMENT ON TABLE consents IS
  '약관 동의 기록. 회원가입 또는 결제 시점에 1행씩 추가. 영구 보관.';
