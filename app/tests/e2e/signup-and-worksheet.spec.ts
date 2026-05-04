import { test, expect } from "@playwright/test";

/**
 * 1 플로우: 랜딩 → 로그인 (시드된 student.starcp 계정) → 대시보드 → 워크시트 진입.
 *
 * 이 테스트는 .env에 SUPABASE 키가 있고 db reset + seed-users 완료된 상태에서만 의미 있음.
 */
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Supabase 미설정 — e2e 스킵"
);

test("학생 로그인 → 대시보드 진입", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("한 사람을 향한 1:1, 다섯 자리.")).toBeVisible();

  await page.goto("/login");
  await page.fill('input[name="email"]', "[email protected]");
  await page.fill('input[name="password"]', "nedabah1!");
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText(/내 학습|등록/)).toBeVisible();
});
