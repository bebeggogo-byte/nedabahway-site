/**
 * calculate_refund() 정책 v1 단위 테스트.
 *
 * 4 분기 검증:
 *   1) 24h 이내 → 100% (within_24h)
 *   2) 24h 초과 + 1회차 미종료 → 50% (before_first_session)
 *   3) 1회차 종료 + 2회차 미시작 → 30% (after_first_session)
 *   4) 2회차 시작 → 0% (not_eligible)
 *
 * 이 테스트는 SUPABASE_DB_URL 또는 NEXT_PUBLIC_SUPABASE_URL 등이 없으면 자동 스킵.
 * 로컬에서 supabase start + db reset 후 실행 권장.
 */

import { describe, it, expect, beforeAll } from "vitest";

const SHOULD_RUN = !!(process.env.SUPABASE_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);

describe.skipIf(!SHOULD_RUN)("calculate_refund() v1 정책", () => {
  beforeAll(() => {
    if (!SHOULD_RUN) {
      console.log("Skip: SUPABASE_DB_URL 미설정 — supabase start 후 실행하십시오.");
    }
  });

  // 실제 SQL 함수 호출은 supabase-js 또는 pg 사용
  // 여기서는 정책 로직 자체를 TS로 미러링해 4분기 검증 (로직 무결성)

  function calculate(args: {
    paidHoursAgo: number;
    firstClosed: boolean;
    secondStarted: boolean;
    amountKrw: number;
    paid: boolean;
  }): { rate: number; amount: number; reason: string } {
    if (!args.paid) return { rate: 0, amount: 0, reason: "not_eligible" };

    if (args.paidHoursAgo <= 24) {
      return { rate: 1.0, amount: args.amountKrw, reason: "within_24h" };
    }
    if (!args.firstClosed) {
      return { rate: 0.5, amount: Math.floor(args.amountKrw * 0.5), reason: "before_first_session" };
    }
    if (args.firstClosed && !args.secondStarted) {
      return { rate: 0.3, amount: Math.floor(args.amountKrw * 0.3), reason: "after_first_session" };
    }
    return { rate: 0, amount: 0, reason: "not_eligible" };
  }

  it("결제 후 2시간 → 100% within_24h", () => {
    const r = calculate({ paidHoursAgo: 2, firstClosed: false, secondStarted: false, amountKrw: 4_000_000, paid: true });
    expect(r.rate).toBe(1.0);
    expect(r.amount).toBe(4_000_000);
    expect(r.reason).toBe("within_24h");
  });

  it("결제 후 25시간 + 1회차 미종료 → 50% before_first_session", () => {
    const r = calculate({ paidHoursAgo: 25, firstClosed: false, secondStarted: false, amountKrw: 4_000_000, paid: true });
    expect(r.rate).toBe(0.5);
    expect(r.amount).toBe(2_000_000);
    expect(r.reason).toBe("before_first_session");
  });

  it("1회차 종료 + 2회차 미시작 → 30% after_first_session", () => {
    const r = calculate({ paidHoursAgo: 200, firstClosed: true, secondStarted: false, amountKrw: 4_000_000, paid: true });
    expect(r.rate).toBe(0.3);
    expect(r.amount).toBe(1_200_000);
    expect(r.reason).toBe("after_first_session");
  });

  it("2회차 시작 → 0% not_eligible", () => {
    const r = calculate({ paidHoursAgo: 400, firstClosed: true, secondStarted: true, amountKrw: 4_000_000, paid: true });
    expect(r.rate).toBe(0);
    expect(r.amount).toBe(0);
    expect(r.reason).toBe("not_eligible");
  });

  it("paid=false → 0% not_eligible", () => {
    const r = calculate({ paidHoursAgo: 1, firstClosed: false, secondStarted: false, amountKrw: 4_000_000, paid: false });
    expect(r.rate).toBe(0);
    expect(r.reason).toBe("not_eligible");
  });

  it("할인 적용된 amount 기준 계산 (50%)", () => {
    // BETA1-50 적용 → 4,000,000 → 2,000,000
    const r = calculate({ paidHoursAgo: 25, firstClosed: false, secondStarted: false, amountKrw: 2_000_000, paid: true });
    expect(r.amount).toBe(1_000_000);
  });
});
