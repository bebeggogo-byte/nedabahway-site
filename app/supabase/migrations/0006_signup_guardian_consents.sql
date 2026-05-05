-- ============================================================
-- 0006_signup_guardian_consents.sql
-- ------------------------------------------------------------
-- 자가 가입(self-signup) 만 14세 미만 아동의 보호자 동의 추적.
-- 기존 parental_consents 테이블은 IDEN 교사 트랙의 학생 데이터
-- (student_subjects)용이라 별도로 관리.
-- ============================================================

CREATE TABLE IF NOT EXISTS signup_guardian_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_email text NOT NULL,
  consent_method text NOT NULL DEFAULT 'email_link',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'consented', 'rejected', 'expired')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consented_at timestamptz,
  consented_ip text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_consents_child ON signup_guardian_consents(child_user_id);
CREATE INDEX IF NOT EXISTS idx_signup_consents_token ON signup_guardian_consents(token);
CREATE INDEX IF NOT EXISTS idx_signup_consents_status ON signup_guardian_consents(status);

ALTER TABLE signup_guardian_consents ENABLE ROW LEVEL SECURITY;

-- 본인(child)는 자기 동의 상태 조회 가능
DROP POLICY IF EXISTS "signup_consents_self_select" ON signup_guardian_consents;
CREATE POLICY "signup_consents_self_select" ON signup_guardian_consents FOR SELECT
  USING (child_user_id = auth.uid() OR is_system_admin(auth.uid()));

-- INSERT/UPDATE는 service_role만 (서버 사이드)
DROP POLICY IF EXISTS "signup_consents_admin" ON signup_guardian_consents;
CREATE POLICY "signup_consents_admin" ON signup_guardian_consents FOR ALL
  USING (is_system_admin(auth.uid()))
  WITH CHECK (is_system_admin(auth.uid()));

COMMENT ON TABLE signup_guardian_consents IS
  '자가 가입 만 14세 미만 보호자 동의 (PIPA 22조). token 7일 유효.';
