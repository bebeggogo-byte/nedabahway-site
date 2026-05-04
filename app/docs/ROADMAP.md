# ROADMAP — 다음 Phase

## Phase 2: RLS 정식판 (1주)

본 작업의 0002_rls.sql은 1차 시안. 정식판에서 강화할 부분:

- 학생이 본인 답변을 submitted 후에는 update 못 하게 잠금
- 코치가 자기 담당 학생만 보도록 enrollments.coach_id 기반 정책 추가
- 학생이 다른 학생의 worksheet_responses 조회 차단 (현재는 user_id로만)
- audit_logs 트리거 모든 민감 테이블에 적용 (현재는 refund_requests, payments만)
- IDEN 교사 다른 학교 데이터 격리 강화 (현재는 created_by/teacher_id 기반)

## Phase 3: API/RPC 명세 (1주)

OpenAPI 스펙 정식 작성:
- `/api/auth/*` — 회원가입·로그인·재설정
- `/api/worksheets/*` — 자동 저장·제출
- `/api/refunds/*` — 본 작업에서 구현, OpenAPI 명세화
- `/api/coach/students/*` — 담당 학생 조회·메모
- `/api/teacher/analytics/*` — 반·학생·시계열
- `/api/ai/*` — guide·embed·similar

## Phase 4: 와이어프레임 (1주)

본 작업은 SSR 페이지 골격만. 정식 디자인:
- 모바일 우선 레이아웃 (iOS/Android 웹앱)
- 화면 전환 애니메이션 (Framer Motion)
- 워크시트 폼 UX 다듬기 (drag·drop, 자동 저장 progress bar)
- 코치 대시보드 시각화 (학생별 정체 신호 자동 알림)
- 교사 분석 페이지 차트 추가 (시계열·비교·예측)

## Phase 5: AI 가이드 본판 (2주)

- next_step·unblocking_hint 학생 화면에 카드로 노출 (1주차부터)
- similar_case·risk_alert 코치 화면에만 (56일 후 활성)
- Voyage AI 임베딩 cron 실제 구현
- 학생 답변 vs 과거 케이스 코사인 유사도 검색
- ai_guidance.accepted 추적 → 다음 가이드 품질 개선

## Phase 6: 배포 + 1기 베타 운영 (지속)

- Vercel 프로덕션 배포
- app.nedabah.org DNS 연결
- 토스페이먼츠 가맹 + 실 결제 키 교체
- 1기 12명 모집 → 12주 운영 → 케이스 누적
- 매주 환불 요청·정체 학생·완료 학생 모니터링

## 환불 정책 v2 (필요 시)

본 작업의 v1 정책은 사장님 직접 지시 그대로:
- 24h 이내 100% / 24h~1회차 50% / 1회차~2회차 30% / 그 후 0%

변경 시:
1. `calculate_refund_v2(p_payment_id)` 새 함수
2. `payments.refund_policy_version` 디폴트 'v2'
3. 기존 결제 v1, 신규 결제 v2로 분기
4. UI는 결제 시점 정책 표시

## 본 작업에서 stub만 둔 부분 명시

- `scripts/embed-responses.ts` — TODO 스텁
- `src/app/api/ai/guide/route.ts` — Anthropic 키 미설정 시 stubGuidance() 사용
- `src/server/payments/toss-refund.ts` — 토스 키 미설정 시 mock 반환
- `src/app/api/webhooks/toss/route.ts` — 결제 confirm mock 분기
- 학생 화면 AI 가이드 카드 — 백엔드만 준비, 프론트 미통합
- 산출물 Storage 업로드 폼 — DB 컬럼만, UI 미완

## 베타 1기 운영 체크리스트

- [ ] Supabase 프로젝트 생성 (사장님)
- [ ] Vercel 배포 + DNS
- [ ] 토스페이먼츠 가맹 신청·승인
- [ ] BETA1-50 코드 활용 30명 모집 (5트랙 합계)
- [ ] 12주 진행 중 매주 코치 대시보드 점검
- [ ] 환불 요청 처리 (3분 이내 응답 약속)
- [ ] 종료 후 수료생 케이스 6~12개 누적 → 2기 정가 자신
