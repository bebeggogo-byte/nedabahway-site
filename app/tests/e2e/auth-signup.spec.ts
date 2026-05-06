import { test, expect } from "@playwright/test";

/**
 * Signup flow coverage — three independent scenarios:
 *  (a) adult signup → success banner via ?ok=1
 *  (b) under-14 → guardian email field + parental consent + isMinor=true via API response
 *  (c) missing required consent → submit disabled or "필수 약관" error surfaced
 *
 * Each test uses a unique e2e email (timestamp suffix). User cleanup is the
 * caller's responsibility (db reset + seed-users).
 */

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Supabase not configured — e2e skipped"
);

const EMAIL_DOMAIN = process.env.TEST_EMAIL_DOMAIN ?? "gmail.com";

function uniqueEmail(label: string): string {
  return `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${EMAIL_DOMAIN}`;
}

test("성인 가입 → 가입완료 안내 노출", async ({ page }) => {
  await page.goto("/signup");

  await page.fill('input[name="display_name"]', "E2E 성인 사용자");
  await page.fill('input[name="email"]', uniqueEmail("adult"));
  await page.fill('input[name="password"]', "nedabah1!");
  await page.fill('input[name="birth_year"]', "2000");

  // Required consents: terms / privacy / refund.
  await page.locator("#consent-terms").check();
  await page.locator("#consent-privacy").check();
  await page.locator("#consent-refund").check();

  await page.locator('button[type="submit"]').click();

  // Server returns ok then client router.push("/signup?ok=1").
  await page.waitForURL(/\/signup\?ok=1/);
  await expect(
    page.getByText("가입 완료. 이메일 확인 메일이 발송되었습니다")
  ).toBeVisible();
});

test("만 14세 미만 → 보호자 이메일 필드 노출 + 가입 시 isMinor=true", async ({ page }) => {
  await page.goto("/signup");

  const minorBirthYear = String(new Date().getFullYear() - 10);

  await page.fill('input[name="display_name"]', "E2E 미성년 사용자");
  await page.fill('input[name="email"]', uniqueEmail("minor"));
  await page.fill('input[name="password"]', "nedabah1!");
  await page.fill('input[name="birth_year"]', minorBirthYear);

  // Birth year change should reveal guardian email field + parental consent.
  const guardian = page.locator('input[name="guardian_email"]');
  await expect(guardian).toBeVisible();
  await guardian.fill(`guardian-${Date.now()}@${EMAIL_DOMAIN}`);

  // Parental consent checkbox now rendered by ConsentCheckboxes.
  await expect(page.locator("#consent-parental")).toBeVisible();
  await page.locator("#consent-terms").check();
  await page.locator("#consent-privacy").check();
  await page.locator("#consent-refund").check();
  await page.locator("#consent-parental").check();

  // Intercept the signup POST to verify isMinor=true in the response body.
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().endsWith("/api/auth/signup") && resp.request().method() === "POST"
  );
  await page.locator('button[type="submit"]').click();
  const response = await responsePromise;

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.isMinor).toBe(true);
});

test("필수 약관 미동의 → 가입 버튼 비활성 또는 에러", async ({ page }) => {
  await page.goto("/signup");

  await page.fill('input[name="display_name"]', "E2E 미동의");
  await page.fill('input[name="email"]', uniqueEmail("nocnst"));
  await page.fill('input[name="password"]', "nedabah1!");
  await page.fill('input[name="birth_year"]', "2000");

  // Only terms + privacy checked, refund intentionally left unchecked.
  await page.locator("#consent-terms").check();
  await page.locator("#consent-privacy").check();

  const submit = page.locator('button[type="submit"]');

  // Primary path: button is disabled until all required consents pass.
  if (await submit.isDisabled()) {
    await expect(submit).toBeDisabled();
    return;
  }

  // Fallback: if disabled flag was somehow bypassed, the form must surface
  // the "필수 약관에 동의해 주십시오" error (client-side or server-side).
  await submit.click();
  await expect(page.getByText("필수 약관에 동의해 주십시오")).toBeVisible();
});
