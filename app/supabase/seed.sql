-- ============================================================
-- seed.sql — 베타 1기 출시용 시드 (idempotent)
-- 실행: supabase db reset (자동) 또는 psql -f
-- ============================================================

-- ── tracks 5개 ──────────────────────────────────────────────
INSERT INTO tracks (id, name, price_krw, duration_weeks, capacity, methodology, has_subjects) VALUES
  ('starcp', 'STARCP 마스터', 4000000, 12, 12,
   'Situation·Target·Action·Result·Customize·Package 6단계 흐름', false),
  ('iden_teacher', 'IDEN 좌표 마스터 — 진로교사', 3500000, 12, 8,
   'IDEN 3칸 좌표 + 5S 학교 적용', true),
  ('iden_pivot', 'IDEN 진로 재설계', 2500000, 12, 6,
   'IDEN 좌표 + 인생 10장면 + 90일 행동', false),
  ('venture', '창직·1인 사업자 1:1', 5000000, 12, 4,
   'STARCP + 린 캔버스 + 5명 인터뷰 + MVP', false),
  ('leadership_5s', '5S 리더십 마스터', 6000000, 24, 4,
   '5S 사이클 (See·Speak·Sense·Steer·Sustain) — 6개월 월 2회', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, price_krw = EXCLUDED.price_krw,
  duration_weeks = EXCLUDED.duration_weeks, capacity = EXCLUDED.capacity,
  methodology = EXCLUDED.methodology;

-- ── session_templates: 트랙당 12개 ──────────────────────────
-- STARCP: 6단계 × 2주씩 + 사후 정리
DELETE FROM session_templates WHERE track_id IN ('starcp','iden_teacher','iden_pivot','venture','leadership_5s');

INSERT INTO session_templates (track_id, seq, title, theme) VALUES
  -- STARCP (12회)
  ('starcp', 1, 'Setup · 삶 정리 시작', 'S단계 진입'),
  ('starcp', 2, 'S — 학생의 상황 듣기', 'Situation'),
  ('starcp', 3, 'T — 목표를 한 줄로', 'Target'),
  ('starcp', 4, 'A — 행동을 설계', 'Action'),
  ('starcp', 5, 'R — 결과를 측정', 'Result'),
  ('starcp', 6, 'C — 컨설턴트의 시그니처', 'Customize'),
  ('starcp', 7, 'P — 패키징과 판매', 'Package'),
  ('starcp', 8, '실전 적용 1', '본인 케이스 1'),
  ('starcp', 9, '실전 적용 2', '본인 케이스 2'),
  ('starcp', 10, '실전 적용 3', '본인 케이스 3'),
  ('starcp', 11, '시그니처 다듬기', '발표 준비'),
  ('starcp', 12, '수료 · 시그니처 발표', '완성·동문 합류'),

  -- IDEN 교사 (12회)
  ('iden_teacher', 1, '교사 자기 좌표', 'IDEN 진입'),
  ('iden_teacher', 2, 'IDEN 3칸 좌표', '한 사람·결핍·강점'),
  ('iden_teacher', 3, '학생 30분 표준형', '시연'),
  ('iden_teacher', 4, '5S — See, Speak', '학기 첫 4주'),
  ('iden_teacher', 5, '5S — Sense, Steer', '학기 중반'),
  ('iden_teacher', 6, '5S — Sustain', '학기 갱신'),
  ('iden_teacher', 7, '자유학기제 적용', '12회기 매핑'),
  ('iden_teacher', 8, '고교학점제 적용', '과목 선택 흐름'),
  ('iden_teacher', 9, '학부모 동행 설계', '가족 자료'),
  ('iden_teacher', 10, '매뉴얼 v1 작성', '초안'),
  ('iden_teacher', 11, '매뉴얼 v2 완성', '코칭 키트 30종'),
  ('iden_teacher', 12, '수료 · 동문 합류', '발표·사례'),

  -- IDEN 진로 재설계 (12회)
  ('iden_pivot', 1, '현재 좌표 진단', '동기'),
  ('iden_pivot', 2, 'IDEN 1차 좌표', '자기 진술 v1'),
  ('iden_pivot', 3, '인생 10장면', '반복 동사 추출'),
  ('iden_pivot', 4, '강점 검증', '3인 인터뷰'),
  ('iden_pivot', 5, '전환 시나리오 3안', '유지·이직·전직'),
  ('iden_pivot', 6, '결정 매트릭스', '기준 5개'),
  ('iden_pivot', 7, '타깃 회사 5곳', 'JD 분석'),
  ('iden_pivot', 8, '자기 진술 v2 + 첫 문장', '회사별 30개'),
  ('iden_pivot', 9, '이력서 골격 3종', '회사 1·2·3'),
  ('iden_pivot', 10, '면접 시뮬레이션', '첫 1분 대본'),
  ('iden_pivot', 11, '90일 행동계획', 'SMART'),
  ('iden_pivot', 12, '수료 · 다음 좌표', '갱신 약속'),

  -- 창직 (12회)
  ('venture', 1, '불편 30개 채집', '문제 발견'),
  ('venture', 2, '수혜자 정의', '공감지도'),
  ('venture', 3, '문제 정의 1줄', '5W1H'),
  ('venture', 4, '인터뷰 5명 (1)', '첫 2명'),
  ('venture', 5, '인터뷰 5명 (2)', '나머지 3명'),
  ('venture', 6, '린 캔버스', '4칸'),
  ('venture', 7, 'MVP 설계', '최소 실험 1주'),
  ('venture', 8, 'MVP 실행', '검증'),
  ('venture', 9, '피벗 결정', '유지·변경·중단'),
  ('venture', 10, '수익·채널 모델', '비즈니스 모델 1쪽'),
  ('venture', 11, '첫 5명 고객 모집', '신청 폼·명단'),
  ('venture', 12, '수료 · 다음 분기', '90일 계획'),

  -- 5S 리더십 (24회 = 6개월 월 2회 → 단순화 12회 표기)
  ('leadership_5s', 1, '5S 자기 진단', '6개월 목표 한 줄'),
  ('leadership_5s', 2, 'See — 팀 위치 진단', '방향성 정렬'),
  ('leadership_5s', 3, 'Speak — 1on1 재설계', 'SBI'),
  ('leadership_5s', 4, 'Sense — 회의 재설계', '처리→설계'),
  ('leadership_5s', 5, 'Steer — 결정과 갈등', '결정 매트릭스'),
  ('leadership_5s', 6, 'Sustain — 90일 로드맵', '간트'),
  ('leadership_5s', 7, '1on1 정착', '월 1회 1on1'),
  ('leadership_5s', 8, '주간 회의 재설계', '5S 결합'),
  ('leadership_5s', 9, '갈등 시나리오', '역할극'),
  ('leadership_5s', 10, '코칭 카드 만들기', '팀 카드 30장'),
  ('leadership_5s', 11, '조직 적용 점검', '상사·팀 진단'),
  ('leadership_5s', 12, '다음 분기 설계', '12주 계획')
;

-- ── worksheet_templates: 풀 스키마 2개 ──────────────────────
INSERT INTO worksheet_templates (session_template_id, code, title, schema, ui_schema, version, analytics_fields)
SELECT
  st.id,
  'starcp_s_situation_v1',
  'STARCP S — 현재 상황과 시그니처 후보',
  jsonb_build_object(
    'type', 'object',
    'required', ARRAY['situation', 'stuck_points', 'strength_seed'],
    'properties', jsonb_build_object(
      'situation', jsonb_build_object(
        'type', 'string', 'minLength', 200, 'maxLength', 600,
        'title', '현재 컨설팅 상황',
        'description', '학생을 만나는 빈도·단가·반복되는 패턴을 200~600자.'
      ),
      'stuck_points', jsonb_build_object(
        'type', 'string', 'maxLength', 600,
        'title', '자주 막히는 지점'
      ),
      'strength_seed', jsonb_build_object(
        'type', 'string', 'maxLength', 200,
        'title', '시그니처로 발전시킬 강점 (한 줄)'
      )
    )
  ),
  jsonb_build_object(
    'situation', jsonb_build_object('widget', 'textarea'),
    'stuck_points', jsonb_build_object('widget', 'textarea'),
    'strength_seed', jsonb_build_object('widget', 'short_text')
  ),
  1,
  ARRAY['situation', 'strength_seed']
FROM session_templates st
WHERE st.track_id = 'starcp' AND st.seq = 2
ON CONFLICT (code, version) DO NOTHING;

INSERT INTO worksheet_templates (session_template_id, code, title, schema, ui_schema, version, analytics_fields)
SELECT
  st.id,
  'iden_teacher_w1_v1',
  'IDEN 1회차 — 한 사람·결핍·강점 좌표 진입',
  jsonb_build_object(
    'type', 'object',
    'required', ARRAY['one_person', 'lack', 'strength', 'reasoning'],
    'properties', jsonb_build_object(
      'one_person', jsonb_build_object(
        'type', 'string', 'maxLength', 80,
        'title', '한 사람 — 누구를 향하는가'
      ),
      'lack', jsonb_build_object(
        'type', 'string', 'maxLength', 80,
        'title', '결핍 — 그 사람의 어떤 결핍에 닿는가'
      ),
      'strength', jsonb_build_object(
        'type', 'string', 'maxLength', 80,
        'title', '강점 — 본인의 어떤 강점이 그 결핍에 닿는가'
      ),
      'reasoning', jsonb_build_object(
        'type', 'string', 'maxLength', 600,
        'title', '왜 이 좌표인가 (한 단락)'
      )
    )
  ),
  jsonb_build_object(
    'one_person', jsonb_build_object('widget', 'short_text'),
    'lack', jsonb_build_object('widget', 'short_text'),
    'strength', jsonb_build_object('widget', 'short_text'),
    'reasoning', jsonb_build_object('widget', 'textarea')
  ),
  1,
  ARRAY['one_person', 'lack', 'strength']
FROM session_templates st
WHERE st.track_id = 'iden_teacher' AND st.seq = 2
ON CONFLICT (code, version) DO NOTHING;

-- ── discount_codes: 베타 1기 50% ────────────────────────────
INSERT INTO discount_codes (code, kind, value, applies_to_track_ids, valid_from, valid_until, max_uses, used_count)
VALUES (
  'BETA1-50',
  'percent',
  50,
  ARRAY['starcp', 'iden_teacher', 'iden_pivot', 'venture', 'leadership_5s'],
  now(),
  '2026-12-31'::timestamptz,
  30,
  0
) ON CONFLICT (code) DO UPDATE SET
  value = EXCLUDED.value, valid_until = EXCLUDED.valid_until, max_uses = EXCLUDED.max_uses;

-- ── cohorts: 트랙당 1개 (1기) ───────────────────────────────
INSERT INTO cohorts (track_id, name, start_date, end_date, status, max_seats)
SELECT track_id, '1기', '2026-06-01'::date,
       ('2026-06-01'::date + (duration_weeks || ' weeks')::interval)::date,
       'recruiting', capacity
FROM tracks
ON CONFLICT DO NOTHING;
