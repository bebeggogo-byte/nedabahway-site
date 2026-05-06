import { test, expect } from "@playwright/test";

/**
 * Email dispatch endpoint coverage — uses the request fixture (no browser):
 *  (a) missing service_role key → 401
 *  (b) valid service_role key with all=1 → 200 and 4 dispatch attempts
 *
 * NOTE: We do NOT assert mailbox delivery. We only verify the route's auth
 * gate and that all four templates are exercised by the handler.
 */

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Supabase not configured — e2e skipped"
);

test("service_role 키 없이 호출 시 401", async ({ request }) => {
  const res = await request.post(
    "/api/_internal/email-test?type=signup_verification"
  );
  expect(res.status()).toBe(401);
});

test("service_role 키로 4종 발송 호출 시 200 반환", async ({ request }) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  test.skip(!serviceKey, "service role key required");

  const res = await request.post("/api/_internal/email-test?all=1", {
    headers: { Authorization: `Bearer ${serviceKey}` },
  });
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(Array.isArray(body.results)).toBe(true);
  // The handler dispatches 4 templates: signup_verification, payment_success,
  // refund_processed, session_reminder. Each call appends one results entry
  // regardless of provider success/failure (errors are captured per-entry).
  expect(body.results).toHaveLength(4);

  const types = body.results.map((r: { type: string }) => r.type);
  expect(types).toEqual([
    "signup_verification",
    "payment_success",
    "refund_processed",
    "session_reminder",
  ]);
});
