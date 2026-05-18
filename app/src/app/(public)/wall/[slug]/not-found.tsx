/**
 * 담벼락 404 — 존재하지 않는 slug 진입 시.
 */
import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function WallNotFound() {
  return (
    <>
      <Nav />
      <main
        id="main"
        className="page page--narrow"
        style={{ textAlign: "center", paddingTop: 80 }}
      >
        <div className="kicker">404 · 담벼락 없음</div>
        <h1 className="h1" style={{ marginTop: 12 }}>
          담벼락을 찾을 수 없습니다.
        </h1>
        <p className="lead" style={{ marginTop: 16 }}>
          링크가 잘못되었거나 담벼락이 삭제되었을 수 있습니다.
        </p>
        <Link href="/wall" className="btn btn--primary" style={{ marginTop: 24 }}>
          내 담벼락으로 →
        </Link>
      </main>
    </>
  );
}
