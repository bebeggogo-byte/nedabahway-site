-- ============================================================
-- 0002_rls.sql — Row-Level Security 정책
-- 활성 역할: student / coach / system_admin
-- school_admin은 정의만 두고 정책 없음 (E-1)
-- 헬퍼: is_iden_teacher() / is_coach() / is_system_admin()
-- ============================================================

-- 모든 테이블 RLS enable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- 학생: 자기 row select·update / 코치·관리자: 모두 select
-- CASE: (1) 학생 A가 학생 B의 profile을 수정 (2) 미인증 사용자 (3) 코치가 다른 코치 row 삭제
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_coach(auth.uid()) OR is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));
-- 본인은 role 변경 불가 (관리자만 가능)

DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
  USING (is_system_admin(auth.uid()));

-- ============================================================
-- tracks — 카탈로그, 모두 read
-- ============================================================
DROP POLICY IF EXISTS "tracks_select_all" ON tracks;
CREATE POLICY "tracks_select_all" ON tracks FOR SELECT USING (true);

DROP POLICY IF EXISTS "tracks_admin_write" ON tracks;
CREATE POLICY "tracks_admin_write" ON tracks FOR ALL
  USING (is_system_admin(auth.uid()));

-- ============================================================
-- cohorts — recruiting 상태는 모두 read, 그 외 활성/완료는 본인 등록 + 코치
-- ============================================================
DROP POLICY IF EXISTS "cohorts_select_active" ON cohorts;
CREATE POLICY "cohorts_select_active" ON cohorts FOR SELECT
  USING (
    status IN ('recruiting', 'active')
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "cohorts_admin_write" ON cohorts;
CREATE POLICY "cohorts_admin_write" ON cohorts FOR ALL
  USING (is_coach(auth.uid()) OR is_system_admin(auth.uid()));

-- ============================================================
-- enrollments
-- 학생: 자기 row / 코치: 모두 / 관리자: 모두
-- CASE: (1) 학생이 다른 학생 등록 정보 조회 (2) 학생이 본인 등록 status 수정 시도
-- ============================================================
DROP POLICY IF EXISTS "enrollments_select" ON enrollments;
CREATE POLICY "enrollments_select" ON enrollments FOR SELECT
  USING (
    user_id = auth.uid()
    OR coach_id = auth.uid()
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "enrollments_insert_self" ON enrollments;
CREATE POLICY "enrollments_insert_self" ON enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_coach(auth.uid()) OR is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "enrollments_update_coach" ON enrollments;
CREATE POLICY "enrollments_update_coach" ON enrollments FOR UPDATE
  USING (is_coach(auth.uid()) OR is_system_admin(auth.uid()))
  WITH CHECK (is_coach(auth.uid()) OR is_system_admin(auth.uid()));

-- ============================================================
-- session_templates — 정적, 모두 read
-- ============================================================
DROP POLICY IF EXISTS "session_templates_select_all" ON session_templates;
CREATE POLICY "session_templates_select_all" ON session_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "session_templates_admin_write" ON session_templates;
CREATE POLICY "session_templates_admin_write" ON session_templates FOR ALL
  USING (is_system_admin(auth.uid()));

-- ============================================================
-- session_progress
-- 학생: 자기 등록의 progress / 코치: 모두 read·update
-- ============================================================
DROP POLICY IF EXISTS "session_progress_select" ON session_progress;
CREATE POLICY "session_progress_select" ON session_progress FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM enrollments e WHERE e.id = session_progress.enrollment_id AND e.user_id = auth.uid())
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "session_progress_update_coach" ON session_progress;
CREATE POLICY "session_progress_update_coach" ON session_progress FOR UPDATE
  USING (is_coach(auth.uid()) OR is_system_admin(auth.uid()));

-- 학생도 자기 진행 상태(opened_at·submitted_at)는 갱신 가능 (워크시트 제출 시)
DROP POLICY IF EXISTS "session_progress_update_self" ON session_progress;
CREATE POLICY "session_progress_update_self" ON session_progress FOR UPDATE
  USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()));

-- ============================================================
-- worksheet_templates — 모두 read
-- ============================================================
DROP POLICY IF EXISTS "worksheet_templates_select_all" ON worksheet_templates;
CREATE POLICY "worksheet_templates_select_all" ON worksheet_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "worksheet_templates_admin_write" ON worksheet_templates;
CREATE POLICY "worksheet_templates_admin_write" ON worksheet_templates FOR ALL
  USING (is_system_admin(auth.uid()));

-- ============================================================
-- worksheet_responses ⭐ — 학생 자기 답변만 read·write / 코치: 모두 read
-- CASE: (1) 학생 A가 학생 B 답변 조회 (2) 학생이 다른 학생 답변 인서트 (3) 코치가 학생 답변 수정
-- ============================================================
DROP POLICY IF EXISTS "responses_select" ON worksheet_responses;
CREATE POLICY "responses_select" ON worksheet_responses FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "responses_insert_self" ON worksheet_responses;
CREATE POLICY "responses_insert_self" ON worksheet_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "responses_update_self" ON worksheet_responses;
CREATE POLICY "responses_update_self" ON worksheet_responses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- coach_notes — 코치만 select·write
-- ============================================================
DROP POLICY IF EXISTS "coach_notes_coach_all" ON coach_notes;
CREATE POLICY "coach_notes_coach_all" ON coach_notes FOR ALL
  USING (is_coach(auth.uid()) OR is_system_admin(auth.uid()))
  WITH CHECK (is_coach(auth.uid()) OR is_system_admin(auth.uid()));

-- 학생: visibility='student_visible' 인 메모만 read
DROP POLICY IF EXISTS "coach_notes_student_visible" ON coach_notes;
CREATE POLICY "coach_notes_student_visible" ON coach_notes FOR SELECT
  USING (
    visibility = 'student_visible'
    AND EXISTS (SELECT 1 FROM enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
  );

-- ============================================================
-- outputs — 본인 등록의 산출물 / 코치 모두
-- ============================================================
DROP POLICY IF EXISTS "outputs_select" ON outputs;
CREATE POLICY "outputs_select" ON outputs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "outputs_insert_self_or_coach" ON outputs;
CREATE POLICY "outputs_insert_self_or_coach" ON outputs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

-- ============================================================
-- payments — 본인 결제만 read / write는 service_role (서버) 또는 코치
-- ============================================================
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

-- INSERT/UPDATE는 service_role 세션 또는 system_admin만 (Route Handler에서 처리)
DROP POLICY IF EXISTS "payments_admin_write" ON payments;
CREATE POLICY "payments_admin_write" ON payments FOR ALL
  USING (is_system_admin(auth.uid()))
  WITH CHECK (is_system_admin(auth.uid()));

-- ============================================================
-- IDEN 모듈 RLS — 본인 학교/반/학생만
-- CASE: (1) 다른 학교 교사가 우리 학교 학생 조회 (2) 동의 없는 학생 분석 (3) 비-IDEN-교사가 진입
-- ============================================================
DROP POLICY IF EXISTS "schools_owner_or_admin" ON schools;
CREATE POLICY "schools_owner_or_admin" ON schools FOR ALL
  USING (
    owner_teacher_id = auth.uid()
    OR is_system_admin(auth.uid())
  )
  WITH CHECK (
    owner_teacher_id = auth.uid()
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "classes_homeroom_or_owner" ON classes;
CREATE POLICY "classes_homeroom_or_owner" ON classes FOR ALL
  USING (
    homeroom_teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM schools s WHERE s.id = school_id AND s.owner_teacher_id = auth.uid())
    OR is_system_admin(auth.uid())
  )
  WITH CHECK (
    homeroom_teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM schools s WHERE s.id = school_id AND s.owner_teacher_id = auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "subjects_creator_or_homeroom" ON student_subjects;
CREATE POLICY "subjects_creator_or_homeroom" ON student_subjects FOR ALL
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.homeroom_teacher_id = auth.uid())
    OR is_system_admin(auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.homeroom_teacher_id = auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "consultations_teacher_only" ON student_consultations;
CREATE POLICY "consultations_teacher_only" ON student_consultations FOR ALL
  USING (teacher_id = auth.uid() OR is_system_admin(auth.uid()))
  WITH CHECK (teacher_id = auth.uid() OR is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "consents_teacher_only" ON parental_consents;
CREATE POLICY "consents_teacher_only" ON parental_consents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_subjects ss
      JOIN classes c ON c.id = ss.class_id
      WHERE ss.id = student_subject_id
        AND (ss.created_by = auth.uid() OR c.homeroom_teacher_id = auth.uid())
    )
    OR is_system_admin(auth.uid())
  );

-- ============================================================
-- AI 모듈 RLS
-- ============================================================
DROP POLICY IF EXISTS "events_self" ON interaction_events;
CREATE POLICY "events_self" ON interaction_events FOR ALL
  USING (user_id = auth.uid() OR is_coach(auth.uid()) OR is_system_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "guidance_self_or_coach" ON ai_guidance;
CREATE POLICY "guidance_self_or_coach" ON ai_guidance FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "guidance_admin_write" ON ai_guidance;
CREATE POLICY "guidance_admin_write" ON ai_guidance FOR INSERT
  WITH CHECK (is_system_admin(auth.uid()) OR is_coach(auth.uid()));

DROP POLICY IF EXISTS "guidance_update_accept" ON ai_guidance;
CREATE POLICY "guidance_update_accept" ON ai_guidance FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- 학생은 accepted 토글만 가능 (다른 컬럼 변경은 server에서 admin client로)

-- case_embeddings: 학생은 is_user_visible=true 만 / 코치 모두
DROP POLICY IF EXISTS "embeddings_visible" ON case_embeddings;
CREATE POLICY "embeddings_visible" ON case_embeddings FOR SELECT
  USING (
    is_user_visible = true
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

-- ============================================================
-- 운영 RLS
-- ============================================================
DROP POLICY IF EXISTS "notif_self" ON notifications;
CREATE POLICY "notif_self" ON notifications FOR ALL
  USING (user_id = auth.uid() OR is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "audit_admin_only" ON audit_logs;
CREATE POLICY "audit_admin_only" ON audit_logs FOR SELECT
  USING (is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "discount_select_all" ON discount_codes;
CREATE POLICY "discount_select_all" ON discount_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "discount_admin_write" ON discount_codes;
CREATE POLICY "discount_admin_write" ON discount_codes FOR ALL
  USING (is_system_admin(auth.uid()));

-- ============================================================
-- refund_requests ⭐ — 학생 자기 요청 + 코치 모두
-- 학생은 INSERT(pending)만, UPDATE 불가
-- ============================================================
DROP POLICY IF EXISTS "refunds_select_self_or_coach" ON refund_requests;
CREATE POLICY "refunds_select_self_or_coach" ON refund_requests FOR SELECT
  USING (
    requested_by = auth.uid()
    OR is_coach(auth.uid())
    OR is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "refunds_insert_student" ON refund_requests;
CREATE POLICY "refunds_insert_student" ON refund_requests FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- 학생은 본인 환불 요청 update 불가 (요청 후 수정 금지)
-- 코치만 status·approved_by·toss_refund_response 등 갱신
DROP POLICY IF EXISTS "refunds_update_coach" ON refund_requests;
CREATE POLICY "refunds_update_coach" ON refund_requests FOR UPDATE
  USING (is_coach(auth.uid()) OR is_system_admin(auth.uid()))
  WITH CHECK (is_coach(auth.uid()) OR is_system_admin(auth.uid()));

-- ============================================================
-- Audit log 자동 인서트 트리거 (refund_requests, payments)
-- ============================================================
CREATE OR REPLACE FUNCTION audit_table_changes() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, before, after)
  VALUES (
    auth.uid(),
    LOWER(TG_OP)::audit_action_t,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER trg_audit_refunds AFTER INSERT OR UPDATE OR DELETE ON refund_requests
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
