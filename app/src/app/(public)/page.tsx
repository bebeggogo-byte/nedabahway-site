/**
 * 공개 랜딩. 5트랙 카드 + 로그인 CTA.
 */
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

interface Track {
  id: string;
  name: string;
  price_krw: number;
  duration_weeks: number;
  capacity: number;
  methodology: string | null;
}

export default async function HomePage() {
  let tracks: Track[] = [];
  if (env.supabase.isConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tracks")
      .select("id, name, price_krw, duration_weeks, capacity, methodology");
    tracks = (data as Track[] | null) ?? [];
  }

  if (!tracks.length) {
    // Supabase 미설정 또는 시드 안 된 환경 fallback
    tracks = FALLBACK_TRACKS;
  }

  return (
    <>
      <Nav />
      <main id="main" className="page">
        <header style={{ marginBottom: 48 }}>
          <div className="kicker">Programs · 5트랙 1:1</div>
          <h1 className="h1" style={{ marginTop: 12 }}>
            한 사람을 향한 1:1, 다섯 자리.
          </h1>
          <p className="lead" style={{ marginTop: 16, maxWidth: "60ch" }}>
            컨설턴트·진로교사·이직자·창직 도전자·리더 — 본인의 자리에서 시작합니다.
            모든 트랙은 1:1, 모든 산출물은 다음 주 월요일 적용 가능한 형태입니다.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {tracks
            .sort((a, b) => trackOrder(a.id) - trackOrder(b.id))
            .map((t) => (
              <article key={t.id} className="card">
                <div className="kicker">PROGRAM {trackOrder(t.id).toString().padStart(2, "0")}</div>
                <h2 className="h2" style={{ marginTop: 8 }}>{t.name}</h2>
                <p className="body" style={{ marginTop: 12 }}>{t.methodology}</p>
                <dl style={{ marginTop: 16, display: "grid", gap: 6, fontSize: ".92rem" }}>
                  <div>
                    <dt style={{ color: "var(--color-ink-soft)", display: "inline" }}>구조 · </dt>
                    <dd style={{ display: "inline" }}>1:1 · {t.duration_weeks}주 · 정원 {t.capacity}명</dd>
                  </div>
                  <div>
                    <dt style={{ color: "var(--color-ink-soft)", display: "inline" }}>가격 · </dt>
                    <dd style={{ display: "inline", fontWeight: 700, color: "var(--color-green-deep)" }}>
                      {(t.price_krw / 10_000).toLocaleString()}만원
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/tracks/${t.id}`}
                  className="btn btn--ghost"
                  style={{ marginTop: 18, width: "100%" }}
                >
                  자세히 보기 →
                </Link>
              </article>
            ))}
        </section>

        <section style={{ marginTop: 64, textAlign: "center" }}>
          <h2 className="h2">먼저 30분, 본인 자리부터 같이 봅니다.</h2>
          <p className="lead" style={{ marginTop: 12 }}>
            상담은 무료입니다. 결제는 적합도 진단 이후입니다.
          </p>
          <Link href="/signup" className="btn btn--primary" style={{ marginTop: 24 }}>
            무료 30분 진단 신청 →
          </Link>
        </section>
      </main>
      <footer
        style={{
          padding: "24px 16px",
          textAlign: "center",
          color: "var(--color-ink-soft)",
          fontSize: ".82rem",
          borderTop: "1px solid var(--color-line)",
        }}
      >
        © 2026 네다바웨이 · 김창환 · ·
        <Link href="/refund-policy" style={{ marginLeft: 6 }}>환불 정책</Link>
      </footer>
    </>
  );
}

function trackOrder(id: string): number {
  return ({ starcp: 1, iden_teacher: 2, iden_pivot: 3, venture: 4, leadership_5s: 5 } as const)[
    id as "starcp"
  ] ?? 99;
}

const FALLBACK_TRACKS: Track[] = [
  { id: "starcp", name: "STARCP 마스터", price_krw: 4_000_000, duration_weeks: 12, capacity: 12, methodology: "STARCP 6단계 흐름" },
  { id: "iden_teacher", name: "IDEN 좌표 마스터 — 진로교사", price_krw: 3_500_000, duration_weeks: 12, capacity: 8, methodology: "IDEN 3칸 좌표 + 5S 학교 적용" },
  { id: "iden_pivot", name: "IDEN 진로 재설계", price_krw: 2_500_000, duration_weeks: 12, capacity: 6, methodology: "IDEN 좌표 + 인생 10장면 + 90일 행동" },
  { id: "venture", name: "창직·1인 사업자 1:1", price_krw: 5_000_000, duration_weeks: 12, capacity: 4, methodology: "STARCP + 린 캔버스 + 5명 인터뷰 + MVP" },
  { id: "leadership_5s", name: "5S 리더십 마스터", price_krw: 6_000_000, duration_weeks: 24, capacity: 4, methodology: "5S 사이클 — 6개월 월 2회" },
];
