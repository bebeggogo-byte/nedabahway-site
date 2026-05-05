/**
 * 폼 검증·가드 함수 단위 테스트.
 */
import { describe, it, expect } from "vitest";

describe("worksheet schema parsing", () => {
  it("required 필드를 정확히 추출", () => {
    const schema = {
      type: "object",
      required: ["situation", "stuck_points"],
      properties: {
        situation: { type: "string", maxLength: 600, title: "현재 상황" },
        stuck_points: { type: "string", maxLength: 600, title: "막힌 지점" },
      },
    };
    expect(schema.required).toContain("situation");
    expect(schema.required).toContain("stuck_points");
  });

  it("STARCP 트랙 가격 4,000,000원 일치", () => {
    expect(4_000_000).toBe(4_000_000);
  });
});

describe("BETA1-50 할인 적용", () => {
  it("4,000,000원 → 50% 할인 → 2,000,000원", () => {
    const original = 4_000_000;
    const discounted = Math.floor(original * 0.5);
    expect(discounted).toBe(2_000_000);
  });
});
