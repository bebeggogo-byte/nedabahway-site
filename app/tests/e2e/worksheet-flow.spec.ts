import { test, expect } from "@playwright/test";

/**
 * End-to-end happy path for the worksheet flow:
 *   login → dashboard → enrolled session → fill WorksheetForm → submit
 *   → navigate to /outputs → assert outputs page loads (with or without entry)
 *
 * Seed account: [email protected] (STARCP track, role=student).
 *
 * Caveat: outputs are not auto-created on worksheet submit per current
 * (student)/outputs/page.tsx schema (outputs table is populated by a
 * separate process). We assert the outputs page renders and the worksheet
 * submission completes; we do NOT hard-assert a specific outputs row.
 */

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Supabase not configured — e2e skipped"
);

const STUDENT_EMAIL = "[email protected]";
const STUDENT_PASSWORD = "nedabah1!";

test("학생이 로그인 → 세션 진입 → 워크시트 제출 → outputs에서 확인", async ({ page }) => {
  // 1) Login.
  await page.goto("/login");
  await page.fill('input[name="email"]', STUDENT_EMAIL);
  await page.fill('input[name="password"]', STUDENT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);

  // 2) Navigate to the current session via dashboard CTA.
  // Dashboard renders a "{seq}회차 워크시트 작성하기 →" link only when
  // an open session_progress row exists. If the seed has no open row, soft-skip.
  const worksheetCta = page
    .getByRole("link", { name: /회차 워크시트 작성하기/ })
    .first();

  if ((await worksheetCta.count()) === 0) {
    test.skip(true, "session progressId not deterministic in seed — TODO");
    return;
  }

  await worksheetCta.click();
  await page.waitForURL(/\/sessions\/[0-9a-f-]+/);

  // 3) WorksheetForm renders dynamic fields from JSON Schema. We don't know
  // the field keys ahead of time, so fill every visible textarea/text input
  // inside the form with placeholder content.
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: /제출/ }) });

  // If this session is the "no worksheet" variant, the form won't exist — soft-skip.
  if ((await form.count()) === 0) {
    test.skip(true, "session has no worksheet template — TODO seed coverage");
    return;
  }

  const textareas = form.locator("textarea");
  const taCount = await textareas.count();
  for (let i = 0; i < taCount; i++) {
    const ta = textareas.nth(i);
    if (await ta.isEditable()) {
      await ta.fill(
        `E2E 자동 응답 ${i + 1}: 이번 회기에서 배운 내용을 충분한 길이로 정리합니다. ` +
          "한 사람을 향한 1:1 코칭의 흐름을 따라가며 스스로의 변화를 적어 봅니다."
      );
    }
  }
  const textInputs = form.locator('input[type="text"]');
  const tiCount = await textInputs.count();
  for (let i = 0; i < tiCount; i++) {
    const ti = textInputs.nth(i);
    if (await ti.isEditable()) {
      await ti.fill(`E2E short ${i + 1}`);
    }
  }

  // 4) Submit. The button label transitions: "제출하기" → "제출 중..." → "제출 완료".
  await form.getByRole("button", { name: /제출하기/ }).click();
  await expect(form.getByRole("button", { name: /제출 완료/ })).toBeVisible({
    timeout: 15_000,
  });

  // 5) Navigate to /outputs and confirm the page loads under the same session.
  await page.goto("/outputs");
  await expect(page).toHaveURL(/\/outputs/);
  await expect(page.getByRole("heading", { name: "내 산출물" })).toBeVisible();
  // Outputs table may or may not have a fresh row depending on backend wiring;
  // we assert the page is reachable (not bounced to /login) and renders either
  // the empty-state copy or at least one output card.
  const hasEntry = await page.locator("li.card").first().isVisible().catch(() => false);
  const hasEmpty = await page
    .getByText("아직 산출물이 없습니다")
    .isVisible()
    .catch(() => false);
  expect(hasEntry || hasEmpty).toBe(true);
});
