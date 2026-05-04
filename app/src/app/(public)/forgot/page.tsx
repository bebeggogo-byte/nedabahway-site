import { Nav } from "@/components/Nav";

export default function ForgotPage() {
  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <h1 className="h1">비밀번호 재설정</h1>
        <p className="lead" style={{ marginTop: 12 }}>
          베타 단계에서는 사장님께 직접 연락 주십시오: <a href="mailto:nedabah.way@gmail.com">nedabah.way@gmail.com</a>
        </p>
        <p className="body" style={{ marginTop: 24 }}>
          정식 출시 시 자동 비밀번호 재설정 메일이 활성화됩니다.
        </p>
      </main>
    </>
  );
}
