# EMAIL SETUP — Resend + Supabase Auth SMTP

## 사전 조건

- [ ] 도메인 결정 (예: `nedabahway.com`)
- [ ] 도메인 DNS 관리 권한 (가비아 · 후이즈 · Route 53 등)
- [ ] Resend 계정 (https://resend.com)

---

## Step 1 — Resend 가입 + 도메인 추가

1. https://resend.com 가입 (무료 플랜: 일 100건 / 월 3,000건 — 베타 1기 충분)
2. **Domains** → **Add Domain** → `nedabahway.com` 입력
3. Resend가 4종 DNS TXT 레코드 안내:
   - SPF: `v=spf1 include:_spf.resend.com ~all` (또는 기존 SPF에 include 추가)
   - DKIM CNAME 1~3개 (Resend가 동적 생성)
   - DMARC: `v=DMARC1; p=none; rua=mailto:[email protected]`
4. 도메인 등록업체에서 위 4종 추가
5. **24~48시간 대기** 후 Resend 콘솔 → 도메인 옆 **"Verified"** 표시

---

## Step 2 — Resend API Key 생성

1. **API Keys** → **Create API Key**
2. **Permission**: `Sending access` (전송 전용, 다른 권한 X)
3. **Domain**: `nedabahway.com` (방금 인증한 도메인)
4. 생성된 키(`re_xxx...`) → **메모장에 즉시 복사** (한 번만 노출)

---

## Step 3 — `.env.local` + Vercel 환경변수 등록

```bash
# .env.local에 추가
RESEND_API_KEY=re_xxx
[email protected]
```

운영 등록:
```bash
cd ~/Desktop/nedabah/app
./scripts/vercel-env-sync.sh
```

---

## Step 4 — Supabase Auth → Resend SMTP 연결

회원가입 인증 메일 · 비밀번호 재설정 메일을 Resend로 보내려면:

1. https://supabase.com/dashboard/project/[your-project]/auth/providers
2. 페이지 아래 **"Custom SMTP"** 섹션 토글 ON
3. 다음 입력:

   | 필드 | 값 |
   |------|---|
   | Host | `smtp.resend.com` |
   | Port | `465` (TLS) 또는 `587` (STARTTLS) |
   | Username | `resend` |
   | Password | (Resend API Key) |
   | Sender email | `[email protected]` |
   | Sender name | `네다바웨이` |

4. **Send test email** → 사장님 본인 메일로 테스트
5. 도착하면 **Save**

### Email Templates 한국어로 커스터마이징

https://supabase.com/dashboard/project/[your-project]/auth/templates

4개 템플릿 한국어로 수정:

#### Confirm signup
```
제목: [네다바웨이] 이메일 인증을 완료해 주십시오
본문: <p>{{ .ConfirmationURL }}</p>
```

(상세 본문은 `/app/src/server/email/templates.ts`의 `signupVerificationHtml` 참고하여 직접 입력)

---

## Step 5 — 발송 검증

배포 후 운영 환경에서 4종 메일 한 번에 테스트:

```bash
curl -X POST 'https://app.nedabahway.com/api/_internal/email-test?all=1&[email protected]' \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

→ 사장님 메일에 4종 도착:
- `[네다바웨이] 이메일 인증을 완료해 주십시오`
- `[네다바웨이] STARCP 마스터 결제가 완료되었습니다`
- `[네다바웨이] 환불이 처리되었습니다`
- `[네다바웨이] 24시간 후 세션: STARCP S — 학생의 상황 듣기`

---

## Step 6 — 트리거 통합 (자동)

| 트리거 | 핸들러 | 메일 종류 |
|-------|--------|---------|
| 회원가입 (Supabase Auth) | Supabase가 자동 호출 (Step 4 SMTP) | Signup verification |
| 결제 완료 webhook | `/api/webhooks/toss/route.ts` | `sendPaymentSuccess` |
| 환불 승인 | `/api/refunds/[id]/approve/route.ts` | `sendRefundProcessed` |
| 세션 24h 전 | Vercel Cron `/api/cron/session-reminder` | `sendSessionReminder` |

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 메일이 스팸함으로 들어감 | DKIM 미설정 | DNS DKIM 레코드 추가 + 24h 전파 대기 |
| `Domain not verified` | DNS 전파 미완료 | 1~24h 대기 후 Resend 콘솔에서 **Verify** 재클릭 |
| `RESEND_API_KEY 미설정` 콘솔 출력 | 환경변수 누락 | Vercel Production env에 추가 후 redeploy |
| Supabase Auth 메일 안 옴 | SMTP 토글 OFF | Custom SMTP 토글 ON 재확인 |
| 사장님 본인 메일에는 오는데 학생에는 안 감 | 발신 도메인 reputation | 도메인 워밍업 (1주 동안 일 50건씩 점진 증가) |

---

## 비용 가이드

**Resend Free Tier**:
- 일 100건 / 월 3,000건 (베타 1기 ~50명 충분)
- 1 검증 도메인

**Resend Pro ($20/월)**:
- 일 5,000건 / 월 50,000건
- 다중 도메인
- 2기 모집 시작 시 업그레이드 권장

---

## 수신거부 (정보통신망법 50조)

마케팅 메일은 모든 수신자에게 수신거부 링크를 노출해야 함.
구현: `/unsubscribe?token=xxx&email=xxx` (`app/src/app/(public)/unsubscribe/page.tsx`)

트랜잭션 메일(결제·환불·인증·세션 알림)은 의무 발송이라 거부 대상 아님 (법률적 정합).
