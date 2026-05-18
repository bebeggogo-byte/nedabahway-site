/**
 * 새 담벼락 만들기. 로그인 필수.
 * Server Action(createWallAction)으로 생성 후 담벼락으로 이동.
 */
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { CoverColorPicker } from "@/components/wall/CoverColorPicker";
import { createWallAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "새 담벼락 만들기",
};

export default async function NewWallPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (env.supabase.isConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login?redirect=/wall/new");
    }
  }

  const sp = await searchParams;

  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <div className="kicker">Wall · 새로 만들기</div>
        <h1 className="h1" style={{ marginTop: 12 }}>
          새 담벼락 만들기
        </h1>
        <p className="lead" style={{ marginTop: 12 }}>
          이름과 설명을 정하면 공유 링크가 바로 만들어집니다.
        </p>

        <form
          action={createWallAction}
          style={{ marginTop: 32, display: "grid", gap: 20 }}
        >
          <label>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              담벼락 이름 <span style={{ color: "var(--color-danger)" }}>*</span>
            </span>
            <input
              name="title"
              type="text"
              required
              maxLength={120}
              placeholder="예: 우리 반 칭찬 담벼락"
              autoComplete="off"
            />
          </label>

          <label>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              설명 <span style={{ color: "var(--color-ink-soft)" }}>(선택)</span>
            </span>
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              placeholder="담벼락을 소개하는 짧은 문구를 적어 주세요."
            />
          </label>

          <div>
            <span style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
              커버 색상
            </span>
            <CoverColorPicker name="cover_color" />
          </div>

          {sp.error && (
            <p role="alert" style={{ color: "var(--color-danger)", fontSize: ".92rem" }}>
              {decodeURIComponent(sp.error)}
            </p>
          )}

          <button className="btn btn--primary" type="submit" style={{ marginTop: 8 }}>
            담벼락 만들기 →
          </button>
        </form>
      </main>
    </>
  );
}
