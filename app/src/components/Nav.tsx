/**
 * 글로벌 네비. 로그인 상태에 따라 링크 변경.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconWall } from "@/components/wall/icons";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  type Role = "student" | "coach" | "school_admin" | "system_admin";
  let role: Role | null = null;
  let displayName: string | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();
    const profile = data as {
      role: string | null;
      display_name: string | null;
    } | null;
    role = (profile?.role as Role | null) ?? "student";
    displayName = profile?.display_name ?? user.email ?? null;
  }

  return (
    <nav className="nav" role="navigation" aria-label="주요 메뉴">
      <Link href="/" className="nav__brand">
        네다바웨이 코칭
      </Link>
      <div className="nav__links">
        {!user ? (
          <>
            <Link href="/refund-policy" className="nav__link">환불 정책</Link>
            <Link href="/login" className="nav__link">로그인</Link>
            <Link href="/signup" className="btn btn--primary">시작하기</Link>
          </>
        ) : (
          <>
            <Link href="/dashboard" className="nav__link">내 학습</Link>
            <Link
              href="/wall"
              className="nav__link"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <IconWall size={16} />
              담벼락
            </Link>
            {role === "coach" || role === "system_admin" ? (
              <Link href="/coach/dashboard" className="nav__link">코치</Link>
            ) : null}
            <span className="nav__link" aria-label={`${role}`}>
              {displayName ?? "프로필"}
            </span>
            <form action="/auth/signout" method="post">
              <button className="btn btn--ghost" type="submit">로그아웃</button>
            </form>
          </>
        )}
      </div>
    </nav>
  );
}
