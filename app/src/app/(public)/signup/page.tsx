import Link from "next/link";
import { Nav } from "@/components/Nav";
import { signUpAction } from "./actions";

export const dynamic = "force-dynamic";

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <h1 className="h1">계정 만들기</h1>
        <p className="lead" style={{ marginTop: 12 }}>
          베타 1기 적합도 진단 신청을 위한 계정입니다.
        </p>

        <form action={signUpAction} style={{ marginTop: 32, display: "grid", gap: 16 }}>
          <label>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>이름</span>
            <input name="display_name" type="text" required autoComplete="name" />
          </label>
          <label>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>이메일</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>비밀번호 (6자 이상)</span>
            <input name="password" type="password" required minLength={6} autoComplete="new-password" />
          </label>
          <Result searchParams={searchParams} />
          <button className="btn btn--primary" type="submit" style={{ marginTop: 8 }}>
            계정 만들고 시작 →
          </button>
        </form>

        <p style={{ marginTop: 24, color: "var(--color-ink-soft)", fontSize: ".94rem" }}>
          이미 가입했나요? <Link href="/login">로그인</Link>
        </p>
      </main>
    </>
  );
}

async function Result({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (sp.error) {
    return (
      <p style={{ color: "var(--color-danger)", fontSize: ".92rem" }} role="alert">
        {decodeURIComponent(sp.error)}
      </p>
    );
  }
  if (sp.ok) {
    return (
      <p style={{ color: "var(--color-green-deep)", fontSize: ".92rem" }} role="status">
        가입 완료. 이메일 확인 후 로그인하십시오.
      </p>
    );
  }
  return null;
}
