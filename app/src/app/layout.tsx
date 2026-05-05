import type { Metadata } from "next";
import "@/styles/tokens.css";

export const metadata: Metadata = {
  title: {
    default: "네다바웨이 코칭 — 5트랙 1:1 플랫폼",
    template: "%s · 네다바웨이",
  },
  description:
    "한 사람을 향한 1:1, 다섯 자리. STARCP·IDEN·창직·5S 리더십 코칭 플랫폼.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "네다바웨이 코칭",
    description: "5트랙 1:1 플랫폼",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main">
          본문 바로가기
        </a>
        {children}
      </body>
    </html>
  );
}
