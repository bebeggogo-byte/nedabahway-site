import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "coach" && role !== "system_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { rejectReason?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const rejectReason = (body.rejectReason ?? "").trim() || "코치 검토 결과 반려";

  const { error } = await supabase
    .from("refund_requests")
    .update({
      status: "rejected",
      reject_reason: rejectReason,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
