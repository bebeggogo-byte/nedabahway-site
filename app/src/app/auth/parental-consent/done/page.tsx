import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ already?: string }>;
}

export default async function ParentalConsentDonePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const already = sp.already === "1";

  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow" style={{ paddingTop: 64 }}>
        <h1 className="h1">
          {already ? "이미 동의되었습니다" : "동의가 완료되었습니다"}
        </h1>
        <section className="card" style={{ marginTop: 32, background: "#e8f5e9" }}>
          <p>자녀의 회원가입이 정상 처리되었습니다.</p>
          <p style={{ marginTop: 12 }}>
            자녀에게 이메일 인증 메일이 발송되었으니, 자녀가 메일 링크를 클릭하면 서비스를 이용할 수 있습니다.
          </p>
        </section>
        <p style={{ marginTop: 32, color: "var(--color-mute)", fontSize: ".88rem" }}>
          개인정보보호법 제22조에 따른 보호자 동의 처리가 완료되었습니다.
          이 동의는 자녀가 회원 탈퇴할 때까지 유효하며, 보호자께서는 언제든지 동의를 철회하실 수 있습니다.
          철회는 contact@nedabahway.com으로 신청해 주십시오.
        </p>
      </main>
      <Footer />
    </>
  );
}
