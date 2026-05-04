import Link from "next/link";
import { Nav } from "@/components/Nav";
import { signInAction } from "./actions";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <h1 className="h1">로그인</h1>
        <p className="lead" style={{ marginTop: 12 }}>
          이메일과 비밀번호로 들어옵니다.
        </p>

        <form action={signInAction} style={{ marginTop: 32, display: "grid", gap: 16 }}>
          <RedirectInput searchParams={searchParams} />
          <label>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>이메일</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>비밀번호</span>
            <input name="password" type="password" required minLength={6} autoComplete="current-password" />
          </label>
          <ErrorMessage searchParams={searchParams} />
          <button className="btn btn--primary" type="submit" style={{ marginTop: 8 }}>
            로그인 →
          </button>
        </form>

        <p style={{ marginTop: 24, color: "var(--color-ink-soft)", fontSize: ".94rem" }}>
          처음이신가요? <Link href="/signup">계정 만들기</Link> · <Link href="/forgot">비밀번호 잊음</Link>
        </p>
      </main>
    </>
  );
}

async function RedirectInput({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const sp = await searchParams;
  const redirect = sp.redirect ?? "/dashboard";
  return <input type="hidden" name="redirect" value={redirect} />;
}

async function ErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.error) return null;
  return (
    <p style={{ color: "var(--color-danger)", fontSize: ".92rem" }} role="alert">
      {decodeURIComponent(sp.error)}
    </p>
  );
}
