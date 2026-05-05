-- ============================================================
-- 0001_init.sql — nedabah-app 데이터 모델 v1
-- 23 tables + 2 views + 4 SQL functions
-- 작성: 2026-05-04 / Phase 1 결정 D-1~D-6, E-1~E-2 반영
-- 사장님 직접 지시: 환불 정책 D-6 (24h/before-1st/after-1st/after-2nd)
-- ============================================================

-- 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- ENUM 타입 (역할·상태·종류)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE role_t AS ENUM ('student', 'coach', 'school_admin', 'system_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cohort_status_t AS ENUM ('recruiting', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status_t AS ENUM ('pending_payment', 'active', 'completed', 'paused', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status_t AS ENUM ('locked', 'open', 'submitted', 'reviewed', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE response_status_t AS ENUM ('draft', 'submitted', 'revised');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE note_visibility_t AS ENUM ('coach_only', 'student_visible', 'admin_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE output_kind_t AS ENUM ('document', 'canvas', 'roadmap', 'manual', 'kit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_t AS ENUM ('requested', 'paid', 'failed', 'refunded', 'partial_refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE identity_policy_t AS ENUM ('pseudonym_only', 'real_name_with_consent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE display_mode_t AS ENUM ('pseudonym', 'real_name');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consent_method_t AS ENUM ('written', 'electronic', 'verbal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_kind_t AS ENUM ('field_focus', 'field_blur', 'idle_30s', 'delete_burst', 'paste', 'submit_attempt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE guidance_kind_t AS ENUM ('next_step', 'unblocking_hint', 'similar_case', 'risk_alert');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE channel_t AS ENUM ('in_app', 'email', 'kakao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_status_t AS ENUM ('queued', 'sent', 'failed', 'read');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action_t AS ENUM ('read', 'create', 'update', 'delete', 'export');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discount_kind_t AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_reason_code_t AS ENUM ('within_24h', 'before_first_session', 'after_first_session', 'not_eligible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_request_status_t AS ENUM ('pending', 'approved', 'rejected', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. profiles — 사용자 프로필 (auth.users 확장)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role role_t NOT NULL DEFAULT 'student',
  phone text,
  job_title text,
  organization text,
  ai_guidance_enabled boolean NOT NULL DEFAULT true,
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization);

-- ============================================================
-- 2. tracks — 5트랙 카탈로그 (정적, id text)
-- ============================================================
CREATE TABLE IF NOT EXISTS tracks (
  id text PRIMARY KEY CHECK (id IN ('starcp', 'iden_teacher', 'iden_pivot', 'venture', 'leadership_5s')),
  name text NOT NULL,
  price_krw int NOT NULL CHECK (price_krw > 0),
  duration_weeks int NOT NULL,
  capacity int NOT NULL,
  methodology text,
  has_subjects boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. cohorts — 기수 (트랙별 N기 N명)
-- ============================================================
CREATE TABLE IF NOT EXISTS cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL REFERENCES tracks(id),
  name text NOT NULL,
  start_date date,
  end_date date,
  status cohort_status_t NOT NULL DEFAULT 'recruiting',
  max_seats int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cohorts_track_status ON cohorts(track_id, status);

-- ============================================================
-- 4. enrollments — 등록 (학생-트랙-기수 매칭)
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id text NOT NULL REFERENCES tracks(id),
  cohort_id uuid REFERENCES cohorts(id),
  coach_id uuid REFERENCES profiles(id),
  status enrollment_status_t NOT NULL DEFAULT 'pending_payment',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id, cohort_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_cohort_status ON enrollments(cohort_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_coach_status ON enrollments(coach_id, status);

-- ============================================================
-- 5. session_templates — 회기 템플릿 (트랙당 12개 표준)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL REFERENCES tracks(id),
  seq int NOT NULL CHECK (seq >= 1),
  title text NOT NULL,
  theme text,
  pre_reading_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, seq)
);

-- ============================================================
-- 6. session_progress — 회기 진행 (등록당 회기마다)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  session_template_id uuid NOT NULL REFERENCES session_templates(id),
  status session_status_t NOT NULL DEFAULT 'locked',
  scheduled_at timestamptz,
  opened_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, session_template_id)
);
CREATE INDEX IF NOT EXISTS idx_session_progress_enrollment_status ON session_progress(enrollment_id, status);
CREATE INDEX IF NOT EXISTS idx_session_progress_scheduled ON session_progress(scheduled_at);

-- ============================================================
-- 7. worksheet_templates — 워크시트 폼 스키마 (D-1 옵션 C: JSON Schema)
-- ============================================================
CREATE TABLE IF NOT EXISTS worksheet_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_template_id uuid NOT NULL REFERENCES session_templates(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  schema jsonb NOT NULL,
  ui_schema jsonb,
  version int NOT NULL DEFAULT 1,
  analytics_fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, version)
);

-- ============================================================
-- 8. worksheet_responses ⭐ — 학생 답변 (자동 저장 + 분석 필드)
-- ============================================================
CREATE TABLE IF NOT EXISTS worksheet_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_progress_id uuid NOT NULL REFERENCES session_progress(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES worksheet_templates(id),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_count int NOT NULL DEFAULT 0,
  time_spent_seconds int NOT NULL DEFAULT 0,
  status response_status_t NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  -- generated 평탄화 컬럼 예시 (분석용 — IDEN 좌표만 미리 박음)
  iden_one_person text GENERATED ALWAYS AS (content->>'one_person') STORED,
  iden_lack text GENERATED ALWAYS AS (content->>'lack') STORED,
  iden_strength text GENERATED ALWAYS AS (content->>'strength') STORED,
  starcp_situation text GENERATED ALWAYS AS (content->>'situation') STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_responses_session ON worksheet_responses(session_progress_id);
CREATE INDEX IF NOT EXISTS idx_responses_user ON worksheet_responses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_content_gin ON worksheet_responses USING gin (content);

-- ============================================================
-- 9. coach_notes — 코치 1on1 메모
-- ============================================================
CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  session_progress_id uuid REFERENCES session_progress(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  visibility note_visibility_t NOT NULL DEFAULT 'coach_only',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coach_notes_enrollment ON coach_notes(enrollment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_notes_author ON coach_notes(author_id);

-- ============================================================
-- 10. outputs — 학생 산출물 (시그니처·매뉴얼·MVP 등)
-- ============================================================
CREATE TABLE IF NOT EXISTS outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  kind output_kind_t NOT NULL,
  title text NOT NULL,
  storage_path text,
  external_url text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outputs_enrollment ON outputs(enrollment_id);

-- ============================================================
-- 11. payments — 결제 (refund_policy_version='v1' 박음, D-6)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_krw int NOT NULL CHECK (amount_krw >= 0),
  original_amount_krw int NOT NULL,
  toss_payment_key text UNIQUE,
  toss_order_id text UNIQUE,
  status payment_status_t NOT NULL DEFAULT 'requested',
  installment_no int NOT NULL DEFAULT 1,
  installment_total int NOT NULL DEFAULT 1,
  discount_code_id uuid,
  paid_at timestamptz,
  refunded_at timestamptz,
  refund_reason text,
  refunded_amount_krw int NOT NULL DEFAULT 0,
  refund_policy_version text NOT NULL DEFAULT 'v1',
  receipt_url text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);

-- ============================================================
-- IDEN 모듈 (4개)
-- ============================================================

-- 12. schools — 학교
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  identity_policy identity_policy_t NOT NULL DEFAULT 'pseudonym_only',
  owner_teacher_id uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schools_owner ON schools(owner_teacher_id);

-- 13. classes — 반
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  grade int CHECK (grade BETWEEN 1 AND 12),
  homeroom_teacher_id uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);

-- 14. student_subjects — 학생 (대상자, D-3 익명 코드 디폴트)
CREATE TABLE IF NOT EXISTS student_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  pseudonym text NOT NULL,
  real_name text,
  display_mode display_mode_t NOT NULL DEFAULT 'pseudonym',
  birth_year int,
  gender text,
  iden_one_person text,
  iden_lack text,
  iden_strength text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_subjects_class ON student_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_creator ON student_subjects(created_by);

-- 15. student_consultations — 학생 상담기록
CREATE TABLE IF NOT EXISTS student_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_subject_id uuid NOT NULL REFERENCES student_subjects(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES profiles(id),
  date date NOT NULL,
  topic text,
  summary text,
  iden_signals jsonb,
  next_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consultations_subject ON student_consultations(student_subject_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_teacher ON student_consultations(teacher_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_date_brin ON student_consultations USING brin (date);

-- ============================================================
-- 16. parental_consents — 보호자 동의 (학생기록·실명·AI 분석)
-- ============================================================
CREATE TABLE IF NOT EXISTS parental_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_subject_id uuid NOT NULL REFERENCES student_subjects(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id),
  consent_scope text[] NOT NULL,
  consent_method consent_method_t NOT NULL,
  consented_at timestamptz NOT NULL,
  evidence_url text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consents_subject ON parental_consents(student_subject_id);
CREATE INDEX IF NOT EXISTS idx_consents_scope ON parental_consents USING gin (consent_scope);

-- ============================================================
-- AI 모듈 (3개)
-- ============================================================

-- 17. interaction_events — 학생 인터랙션 (focus·idle·paste 등)
CREATE TABLE IF NOT EXISTS interaction_events (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  response_id uuid REFERENCES worksheet_responses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind event_kind_t NOT NULL,
  field_key text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_response ON interaction_events(response_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user_kind ON interaction_events(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_events_created_brin ON interaction_events USING brin (created_at);

-- 18. ai_guidance — AI 가이드 결과 (next_step · unblocking · similar · risk)
CREATE TABLE IF NOT EXISTS ai_guidance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES worksheet_responses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind guidance_kind_t NOT NULL,
  prompt_hash text,
  model text,
  guidance text NOT NULL,
  reasoning text,
  similar_case_ids uuid[] NOT NULL DEFAULT '{}',
  accepted boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guidance_response ON ai_guidance(response_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guidance_user_kind ON ai_guidance(user_id, kind);

-- 19. case_embeddings — 케이스 임베딩 (D-4: 56일 후 학생 노출)
CREATE TABLE IF NOT EXISTS case_embeddings (
  response_id uuid PRIMARY KEY REFERENCES worksheet_responses(id) ON DELETE CASCADE,
  track_id text NOT NULL REFERENCES tracks(id),
  embedding vector(1536),
  is_user_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- ivfflat 인덱스는 데이터 N>1000일 때만 의미 — 초기엔 생성 안 함, ROADMAP에 기록

-- ============================================================
-- 운영 (4개) — 환불 포함
-- ============================================================

-- 20. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb,
  channel channel_t NOT NULL DEFAULT 'in_app',
  status notif_status_t NOT NULL DEFAULT 'queued',
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_status ON notifications(user_id, status, created_at DESC);

-- 21. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  actor_id uuid REFERENCES profiles(id),
  action audit_action_t NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

-- 22. discount_codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind discount_kind_t NOT NULL,
  value int NOT NULL CHECK (value > 0),
  applies_to_track_ids text[],
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  max_uses int NOT NULL,
  used_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 23. refund_requests ⭐ — 환불 요청 (학생 → 코치 승인 → 토스 호출)
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES profiles(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  student_reason text,
  calculated_rate numeric(4, 3),
  calculated_amount_krw int,
  reason_code refund_reason_code_t,
  status refund_request_status_t NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  reject_reason text,
  toss_refund_response jsonb,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refund_requests(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refund_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON refund_requests(requested_by, requested_at DESC);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_enrollments_updated BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_session_progress_updated BEFORE UPDATE ON session_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_responses_updated BEFORE UPDATE ON worksheet_responses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_coach_notes_updated BEFORE UPDATE ON coach_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_refunds_updated BEFORE UPDATE ON refund_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SQL 함수 4개
-- ============================================================

-- (1) is_iden_teacher(uid) — IDEN 교사 트랙 등록자만 true
CREATE OR REPLACE FUNCTION is_iden_teacher(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE user_id = uid
      AND track_id = 'iden_teacher'
      AND status IN ('active', 'completed')
  );
$$;

-- (2) is_coach(uid) — profiles.role = 'coach'
CREATE OR REPLACE FUNCTION is_coach(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = uid AND role = 'coach'
  );
$$;

-- (3) is_system_admin(uid) — profiles.role = 'system_admin'
CREATE OR REPLACE FUNCTION is_system_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = uid AND role = 'system_admin'
  );
$$;

-- (4) calculate_refund(payment_id) — D-6 환불 정책 v1
--   24h 이내 → 100% (within_24h)
--   24h 초과 + 1회차 미종료 → 50% (before_first_session)
--   1회차 종료 + 2회차 미시작 → 30% (after_first_session)
--   그 외 → 0% (not_eligible)
CREATE OR REPLACE FUNCTION calculate_refund(p_payment_id uuid)
RETURNS TABLE (rate numeric(4, 3), amount_krw int, reason_code refund_reason_code_t)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_hours numeric;
  v_first_closed boolean;
  v_second_started boolean;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;

  IF NOT FOUND OR v_payment.status != 'paid' THEN
    RETURN QUERY SELECT 0::numeric(4, 3), 0, 'not_eligible'::refund_reason_code_t;
    RETURN;
  END IF;

  v_hours := EXTRACT(EPOCH FROM (now() - v_payment.paid_at)) / 3600.0;

  v_first_closed := EXISTS (
    SELECT 1 FROM session_progress sp
    JOIN session_templates st ON st.id = sp.session_template_id
    WHERE sp.enrollment_id = v_payment.enrollment_id
      AND st.seq = 1
      AND sp.status IN ('closed', 'reviewed')
  );

  v_second_started := EXISTS (
    SELECT 1 FROM session_progress sp
    JOIN session_templates st ON st.id = sp.session_template_id
    WHERE sp.enrollment_id = v_payment.enrollment_id
      AND st.seq = 2
      AND sp.status IN ('open', 'submitted', 'reviewed', 'closed')
  );

  IF v_hours <= 24 THEN
    RETURN QUERY SELECT 1.000::numeric(4, 3), v_payment.amount_krw, 'within_24h'::refund_reason_code_t;
  ELSIF NOT v_first_closed THEN
    RETURN QUERY SELECT 0.500::numeric(4, 3), FLOOR(v_payment.amount_krw * 0.5)::int, 'before_first_session'::refund_reason_code_t;
  ELSIF v_first_closed AND NOT v_second_started THEN
    RETURN QUERY SELECT 0.300::numeric(4, 3), FLOOR(v_payment.amount_krw * 0.3)::int, 'after_first_session'::refund_reason_code_t;
  ELSE
    RETURN QUERY SELECT 0.000::numeric(4, 3), 0, 'not_eligible'::refund_reason_code_t;
  END IF;
END;
$$;

-- ============================================================
-- 분석 뷰 2개 (보호자 동의 기반 강제)
-- ============================================================

-- 반별 IDEN 좌표 평균/최빈, 학생 수, 동의율, 마지막 상담일
CREATE OR REPLACE VIEW v_class_iden_summary AS
SELECT
  c.id AS class_id,
  c.school_id,
  c.name AS class_name,
  c.grade,
  COUNT(DISTINCT ss.id) AS student_count,
  COUNT(DISTINCT pc.student_subject_id) FILTER (
    WHERE 'ai_analysis' = ANY(pc.consent_scope) AND pc.revoked_at IS NULL
  ) AS analysis_consent_count,
  ROUND(
    100.0 * COUNT(DISTINCT pc.student_subject_id) FILTER (
      WHERE 'ai_analysis' = ANY(pc.consent_scope) AND pc.revoked_at IS NULL
    ) / NULLIF(COUNT(DISTINCT ss.id), 0),
    1
  ) AS analysis_consent_pct,
  MAX(sc.date) AS last_consultation_date
FROM classes c
LEFT JOIN student_subjects ss ON ss.class_id = c.id
LEFT JOIN parental_consents pc ON pc.student_subject_id = ss.id
LEFT JOIN student_consultations sc ON sc.student_subject_id = ss.id
GROUP BY c.id, c.school_id, c.name, c.grade;

-- 학생별 IDEN 좌표 시계열 (월 bucket, 동의 강제)
CREATE OR REPLACE VIEW v_student_iden_timeline AS
SELECT
  ss.id AS student_subject_id,
  ss.class_id,
  date_trunc('month', sc.date) AS month_bucket,
  COUNT(*) AS consultation_count,
  STRING_AGG(DISTINCT sc.iden_signals::text, '; ') AS iden_signals_summary
FROM student_subjects ss
JOIN student_consultations sc ON sc.student_subject_id = ss.id
JOIN parental_consents pc ON pc.student_subject_id = ss.id
WHERE 'ai_analysis' = ANY(pc.consent_scope)
  AND pc.revoked_at IS NULL
GROUP BY ss.id, ss.class_id, date_trunc('month', sc.date);

-- ============================================================
-- 끝.
-- 다음 마이그레이션: 0002_rls.sql (정책)
-- ============================================================
