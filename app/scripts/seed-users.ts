/**
 * scripts/seed-users.ts — 베타 1기 테스트 계정 시드
 *
 * 실행: pnpm seed:users
 *
 * 생성:
 *  - [email protected] / role=coach (사장님 대역)
 *  - [email protected] / STARCP 1기 + 결제 row (paid_at = now()-25h, 50% 환불 시나리오)
 *  - [email protected] / IDEN 교사 1기 + 학교·반·학생 3명 더미
 *  - [email protected] / IDEN 진로 1기 + 결제 row (paid_at = now()-2h, 100% 환불 시나리오)
 *
 * 모든 계정 비밀번호: nedabah1!
 * idempotent: 이미 있으면 스킵.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[seed-users] NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 둘 다 .env.local에 있어야 합니다.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "nedabah1!";

interface UserSpec {
  email: string;
  display_name: string;
  role: "student" | "coach" | "system_admin";
}

const USERS: UserSpec[] = [
  { email: "[email protected]", display_name: "김창환 코치", role: "coach" },
  { email: "[email protected]", display_name: "STARCP 베타 학생", role: "student" },
  { email: "[email protected]", display_name: "IDEN 교사 베타", role: "student" },
  { email: "[email protected]", display_name: "이직 베타 학생", role: "student" },
];

async function ensureUser(spec: UserSpec): Promise<string> {
  // 기존 사용자 확인
  const { data: existing } = await sb.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === spec.email);
  if (found) {
    console.log(`  · 이미 존재 ${spec.email}`);
    // profile upsert
    await sb.from("profiles").upsert({
      id: found.id,
      display_name: spec.display_name,
      role: spec.role,
    });
    return found.id;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email: spec.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: spec.display_name },
  });
  if (error || !data?.user) {
    throw new Error(`[seed] ${spec.email} 생성 실패: ${error?.message}`);
  }
  await sb.from("profiles").upsert({
    id: data.user.id,
    display_name: spec.display_name,
    role: spec.role,
  });
  console.log(`  + 생성 ${spec.email} → ${data.user.id}`);
  return data.user.id;
}

async function getCohort(trackId: string): Promise<string> {
  const { data } = await sb
    .from("cohorts")
    .select("id")
    .eq("track_id", trackId)
    .eq("status", "recruiting")
    .limit(1)
    .single();
  if (!data) throw new Error(`[seed] cohort for ${trackId} 없음. seed.sql 먼저 적용.`);
  return data.id;
}

async function createEnrollmentAndPayment(opts: {
  user_id: string;
  coach_id: string;
  track_id: string;
  paid_hours_ago: number;
  amount_krw: number;
}) {
  const cohortId = await getCohort(opts.track_id);

  // enrollment
  const { data: enr } = await sb
    .from("enrollments")
    .upsert(
      {
        user_id: opts.user_id,
        track_id: opts.track_id,
        cohort_id: cohortId,
        coach_id: opts.coach_id,
        status: "active",
        started_at: new Date(Date.now() - opts.paid_hours_ago * 3600_000).toISOString(),
      },
      { onConflict: "user_id,track_id,cohort_id" }
    )
    .select("id")
    .single();

  if (!enr) throw new Error(`[seed] enrollment 생성 실패 ${opts.track_id}`);

  // payment
  const paidAt = new Date(Date.now() - opts.paid_hours_ago * 3600_000).toISOString();
  await sb.from("payments").upsert(
    {
      enrollment_id: enr.id,
      user_id: opts.user_id,
      amount_krw: opts.amount_krw,
      original_amount_krw: opts.amount_krw,
      status: "paid",
      paid_at: paidAt,
      installment_no: 1,
      installment_total: 1,
      refund_policy_version: "v1",
      raw_response: { mocked: true, seed: true },
      toss_order_id: `seed-${opts.track_id}-${opts.user_id.slice(0, 8)}`,
    },
    { onConflict: "toss_order_id" }
  );

  // session_progress: 1회차 미시작 (locked)
  const { data: tmpls } = await sb
    .from("session_templates")
    .select("id, seq")
    .eq("track_id", opts.track_id)
    .order("seq", { ascending: true });

  if (tmpls) {
    for (const t of tmpls) {
      await sb.from("session_progress").upsert(
        {
          enrollment_id: enr.id,
          session_template_id: t.id,
          status: t.seq === 1 ? "open" : "locked",
        },
        { onConflict: "enrollment_id,session_template_id" }
      );
    }
  }

  console.log(`  · ${opts.track_id} enrollment + payment (paid ${opts.paid_hours_ago}h ago)`);
  return enr.id;
}

async function seedIdenTeacherSchool(teacherId: string) {
  // 학교 1개
  const { data: school } = await sb
    .from("schools")
    .upsert(
      {
        name: "제주 베타 중학교",
        region: "제주특별자치도",
        identity_policy: "pseudonym_only",
        owner_teacher_id: teacherId,
      },
      { onConflict: "name" }
    )
    .select("id")
    .single();

  if (!school) return;

  // 반 1개
  const { data: cls } = await sb
    .from("classes")
    .upsert(
      {
        school_id: school.id,
        name: "2학년 3반",
        grade: 8,
        homeroom_teacher_id: teacherId,
      },
      { onConflict: "school_id,name" }
    )
    .select("id")
    .single();

  if (!cls) return;

  // 학생 더미 3명
  for (const idx of [1, 2, 3]) {
    await sb.from("student_subjects").upsert(
      {
        class_id: cls.id,
        pseudonym: `S${String(idx).padStart(3, "0")}`,
        display_mode: "pseudonym",
        birth_year: 2012,
        iden_one_person: idx === 1 ? "할머니" : null,
        iden_lack: idx === 1 ? "스마트폰 사용 어려움" : null,
        iden_strength: idx === 1 ? "차분히 설명함" : null,
        created_by: teacherId,
      },
      { onConflict: "class_id,pseudonym" }
    );
  }

  console.log("  · 학교 1, 반 1, 학생 3명 시드 완료");
}

async function main() {
  console.log("[seed-users] 시작");

  const ids: Record<string, string> = {};
  for (const u of USERS) {
    ids[u.email] = await ensureUser(u);
  }

  const coachId = ids["[email protected]"];

  // STARCP 베타: 25h 전 결제 (50% 환불 시나리오)
  await createEnrollmentAndPayment({
    user_id: ids["[email protected]"],
    coach_id: coachId,
    track_id: "starcp",
    paid_hours_ago: 25,
    amount_krw: 4_000_000,
  });

  // IDEN 진로 재설계 베타: 2h 전 결제 (100% 환불 시나리오)
  await createEnrollmentAndPayment({
    user_id: ids["[email protected]"],
    coach_id: coachId,
    track_id: "iden_pivot",
    paid_hours_ago: 2,
    amount_krw: 2_500_000,
  });

  // IDEN 교사 베타: 등록 + 학교·반·학생 더미
  await createEnrollmentAndPayment({
    user_id: ids["[email protected]"],
    coach_id: coachId,
    track_id: "iden_teacher",
    paid_hours_ago: 100,
    amount_krw: 3_500_000,
  });
  await seedIdenTeacherSchool(ids["[email protected]"]);

  console.log("\n[seed-users] 완료. 로그인 정보:");
  console.log("  비밀번호 공통: nedabah1!");
  for (const u of USERS) {
    console.log(`  · ${u.email} (${u.role}) → ${u.display_name}`);
  }
}

main().catch((err) => {
  console.error("[seed-users] 실패:", err);
  process.exit(1);
});
