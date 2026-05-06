import { test, expect } from "@playwright/test";

/**
 * Login flow coverage — three tests against seeded accounts:
 *  (a) valid seed account → /dashboard redirect + dashboard shell visible
 *  (b) wrong password → /login?error= surfaced
 *  (c) post-login direct /dashboard access → no redirect to /login
 *
 * Seed accounts (created by app/scripts/seed-users.ts):
 *   [email protected]  (role=student, STARCP track)
 *   password = nedabah1!
 */

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Supabase not configured — e2e skipped"
);

const STUDENT_EMAIL = "[email protected]";
const STUDENT_PASSWORD = "nedabah1!";

test("유효한 시드계정 로그인 → /dashboard 리다이렉트", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', STUDENT_EMAIL);
  await page.fill('input[name="password"]', STUDENT_PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/dashboard/);
  // Dashboard kicker is "My Learning · 내 학습"; the section header "내 등록"
  // is always rendered. Either signal is sufficient evidence the shell loaded.
  await expect(page.getByText(/내 학습|내 등록|등록|트랙/)).toBeVisible();
});

test("잘못된 비밀번호 → /login?error=", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', STUDENT_EMAIL);
  await page.fill('input[name="password"]', "definitely-wrong-password");
  await page.click('button[type="submit"]');

  // signInAction redirects back to /login?error=<encoded message>.
  await page.waitForURL(/\/login\?.*error=/);
  expect(page.url()).toMatch(/error=/);
  // role="alert" block is rendered when sp.error is present.
  await expect(page.getByRole("alert")).toBeVisible();
});

test("로그인 후 /dashboard 직접 접근 → 미리다이렉트", async ({ page }) => {
  // Authenticate first.
  await page.goto("/login");
  await page.fill('input[name="email"]', STUDENT_EMAIL);
  await page.fill('input[name="password"]', STUDENT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);

  // Direct nav must NOT bounce back to /login.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  expect(page.url()).not.toMatch(/\/login/);
});
