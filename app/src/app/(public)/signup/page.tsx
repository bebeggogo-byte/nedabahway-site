"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ConsentCheckboxes, type ConsentState } from "@/components/ConsentCheckboxes";

function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const errorMsg = search.get("error");
  const ok = search.get("ok");

  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [allRequired, setAllRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    errorMsg ? decodeURIComponent(errorMsg) : null
  );

  const showParental = birthYear !== null && new Date().getFullYear() - birthYear < 14;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent || !allRequired) {
      setError("필수 약관에 동의해 주십시오.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.append("terms", consent.terms ? "1" : "0");
    fd.append("privacy", consent.privacy ? "1" : "0");
    fd.append("refund", consent.refund ? "1" : "0");
    fd.append("parental", consent.parental ? "1" : "0");
    fd.append("marketing", consent.marketing ? "1" : "0");
    if (birthYear) fd.append("birth_year", String(birthYear));

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "가입 실패");
      setSubmitting(false);
      return;
    }
    router.push("/signup?ok=1");
  }

  return (
    <main id="main" className="page page--narrow">
      <h1 className="h1">계정 만들기</h1>
      <p className="lead" style={{ marginTop: 12 }}>
        베타 1기 적합도 진단 신청을 위한 계정입니다.
      </p>

      {ok && (
        <p
          role="status"
          style={{
            marginTop: 16,
            padding: 16,
            background: "#e8f5e9",
            borderRadius: 6,
            color: "#1b5e20",
          }}
        >
          가입 완료. 이메일 확인 메일이 발송되었습니다. 메일 링크 클릭 후 로그인하십시오.
        </p>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 16 }}>
        <label>
          <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>이름</span>
          <input name="display_name" type="text" required autoComplete="name" />
        </label>
        <label>
          <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>이메일</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>비밀번호 (8자 이상)</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <label>
          <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>출생 연도</span>
          <input
            name="birth_year"
            type="number"
            min="1940"
            max={new Date().getFullYear()}
            required
            placeholder="예: 2000"
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setBirthYear(Number.isFinite(v) && v > 1940 ? v : null);
            }}
          />
          <span style={{ fontSize: ".82rem", color: "var(--color-mute)" }}>
            만 14세 미만은 보호자 동의가 필요합니다 (PIPA 22조).
          </span>
        </label>

        {showParental && (
          <label>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              보호자 이메일 (만 14세 미만 필수)
            </span>
            <input
              name="guardian_email"
              type="email"
              required
              placeholder="[email protected]"
            />
            <span style={{ fontSize: ".82rem", color: "var(--color-mute)" }}>
              가입 후 보호자 이메일로 동의 요청 링크가 발송됩니다.
            </span>
          </label>
        )}

        <ConsentCheckboxes
          showParental={showParental}
          onChange={(s, allReq) => {
            setConsent(s);
            setAllRequired(allReq);
          }}
        />

        {error && (
          <p style={{ color: "var(--color-danger, #c00)", fontSize: ".92rem" }} role="alert">
            {error}
          </p>
        )}

        <button
          className="btn btn--primary"
          type="submit"
          disabled={submitting || !allRequired}
          style={{ marginTop: 8 }}
        >
          {submitting ? "가입 중..." : "계정 만들고 시작 →"}
        </button>
      </form>

      <p style={{ marginTop: 24, color: "var(--color-ink-soft)", fontSize: ".94rem" }}>
        이미 가입했나요? <Link href="/login">로그인</Link>
      </p>
    </main>
  );
}

export default function SignupPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={<main className="page page--narrow"><p>로딩...</p></main>}>
        <SignupForm />
      </Suspense>
      <Footer />
    </>
  );
}
