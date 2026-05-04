import { Nav } from "@/components/Nav";

export const metadata = {
  title: "환불 정책",
};

export default function RefundPolicyPage() {
  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <div className="kicker">Policy · v1</div>
        <h1 className="h1" style={{ marginTop: 12 }}>환불 정책</h1>
        <p className="lead" style={{ marginTop: 18 }}>
          결제 후 24시간 이내에는 전액 돌려드린다.<br />
          24시간이 지나면 절반을 돌려드린다.<br />
          첫 회차 강의가 끝난 뒤부터 두 번째 회차가 시작되기 전까지는 30%를 돌려드린다.<br />
          두 번째 회차가 시작된 뒤에는 환불이 어렵다.
        </p>
        <p className="body" style={{ marginTop: 24 }}>
          환불 신청은 등록 상세 페이지에서 한다. 신청을 받은 뒤 사장님이 직접 검토한다.
          승인 시 토스페이먼츠를 통해 결제 수단으로 환불된다.
        </p>

        <h2 className="h2" style={{ marginTop: 48 }}>구간별 비율</h2>
        <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-line-strong)", textAlign: "left", fontSize: ".88rem" }}>
              <th style={{ padding: 10 }}>시점</th>
              <th style={{ padding: 10 }}>환불 비율</th>
              <th style={{ padding: 10 }}>코드</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
              <td style={{ padding: 10 }}>결제 후 24시간 이내</td>
              <td style={{ padding: 10 }}>100%</td>
              <td style={{ padding: 10, fontSize: ".82rem", color: "var(--color-ink-soft)" }}>within_24h</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
              <td style={{ padding: 10 }}>24시간 초과 ~ 1회차 시작 전</td>
              <td style={{ padding: 10 }}>50%</td>
              <td style={{ padding: 10, fontSize: ".82rem", color: "var(--color-ink-soft)" }}>before_first_session</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
              <td style={{ padding: 10 }}>1회차 종료 ~ 2회차 시작 전</td>
              <td style={{ padding: 10 }}>30%</td>
              <td style={{ padding: 10, fontSize: ".82rem", color: "var(--color-ink-soft)" }}>after_first_session</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
              <td style={{ padding: 10 }}>2회차 시작 이후</td>
              <td style={{ padding: 10 }}>환불 불가</td>
              <td style={{ padding: 10, fontSize: ".82rem", color: "var(--color-ink-soft)" }}>not_eligible</td>
            </tr>
          </tbody>
        </table>

        <p className="body" style={{ marginTop: 32, fontSize: ".88rem" }}>
          정책 버전: v1 (2026-05-04 기준).
          향후 변경 시 신규 결제부터 v2 정책이 적용되며, 기존 결제는 결제 시점 정책을 그대로 따릅니다.
        </p>
      </main>
    </>
  );
}
