import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { SYSTEM_PROMPTS, type GuidanceKind } from "@/server/ai/system-prompts";

/**
 * POST /api/ai/guide
 * body: { responseId, kind? = 'next_step' }
 *
 * Anthropic 키 미설정 시 stub 응답 반환.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { responseId?: string; kind?: GuidanceKind };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const responseId = body.responseId;
  const kind: GuidanceKind = body.kind ?? "next_step";
  if (!responseId) return NextResponse.json({ error: "missing_response_id" }, { status: 400 });

  const { data: resp } = await supabase
    .from("worksheet_responses")
    .select(
      `id, content, user_id,
       worksheet_templates:template_id ( title, code ),
       session_progress:session_progress_id ( session_template_id )`
    )
    .eq("id", responseId)
    .single();

  if (!resp) return NextResponse.json({ error: "response_not_found" }, { status: 404 });

  const r = resp as unknown as {
    id: string;
    content: Record<string, unknown>;
    user_id: string;
    worksheet_templates: { title: string; code: string } | null;
  };

  // ai_guidance_enabled 체크
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_guidance_enabled")
    .eq("id", r.user_id)
    .single();
  const enabled = (profile as { ai_guidance_enabled?: boolean } | null)?.ai_guidance_enabled !== false;
  if (!enabled && r.user_id === user.id) {
    return NextResponse.json({ error: "ai_disabled_by_user" }, { status: 403 });
  }

  // Stub fallback
  if (!env.anthropic.isConfigured) {
    const stub = stubGuidance(kind, r.content);
    await persistGuidance({
      responseId,
      userId: r.user_id,
      kind,
      model: "stub",
      guidance: stub.guidance,
      reasoning: stub.reasoning,
    });
    return NextResponse.json({ guidance: stub.guidance, reasoning: stub.reasoning, mocked: true });
  }

  // Anthropic 호출
  const client = new Anthropic({ apiKey: env.anthropic.apiKey });
  const userPrompt =
    `[워크시트] ${r.worksheet_templates?.title ?? "—"}\n` +
    `[학생 답변]\n${JSON.stringify(r.content, null, 2)}\n\n` +
    `위 답변을 보고 ${kind} 가이드를 작성해 주세요.`;

  let aiResponse: string;
  try {
    const msg = await client.messages.create({
      model: env.anthropic.model,
      max_tokens: 600,
      system: SYSTEM_PROMPTS[kind],
      messages: [{ role: "user", content: userPrompt }],
    });
    aiResponse = msg.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  } catch (err) {
    console.error("[ai/guide] Anthropic 호출 실패", err);
    const stub = stubGuidance(kind, r.content);
    await persistGuidance({
      responseId,
      userId: r.user_id,
      kind,
      model: "stub-fallback",
      guidance: stub.guidance,
      reasoning: `Anthropic 호출 실패 → stub: ${String(err)}`,
    });
    return NextResponse.json({ guidance: stub.guidance, reasoning: stub.reasoning, mocked: true });
  }

  // guidance/reasoning 파싱 (간단 — 첫 줄 = guidance, 그 외 = reasoning)
  const lines = aiResponse.split("\n").map((l) => l.trim()).filter(Boolean);
  const guidance = lines[0] ?? aiResponse;
  const reasoning = lines.slice(1).join(" ");

  await persistGuidance({
    responseId,
    userId: r.user_id,
    kind,
    model: env.anthropic.model,
    guidance,
    reasoning,
  });

  return NextResponse.json({ guidance, reasoning });
}

function stubGuidance(kind: GuidanceKind, content: Record<string, unknown>): { guidance: string; reasoning: string } {
  const filled = Object.values(content).filter((v) => typeof v === "string" && v.length > 0).length;
  const total = Object.keys(content).length;
  if (kind === "next_step") {
    if (filled < total) {
      return {
        guidance: `먼저 비어 있는 칸 한 곳을 한 줄로 채워 보십시오. 학생, 짧아도 됩니다.`,
        reasoning: `${total}칸 중 ${filled}칸 채움. 비어 있는 칸이 있어 다음 한 단계는 그쪽 채우기.`,
      };
    }
    return {
      guidance: `한 칸을 다시 읽고, 학생 본인의 단어 한 개로 바꿔 보십시오.`,
      reasoning: `모든 칸 채움. 다음 단계는 표현을 본인의 언어로 압축.`,
    };
  }
  if (kind === "unblocking_hint") {
    return {
      guidance: `학생, 지금 막힌 자리는 답이 없는 곳일 수도 있습니다. 두 가지 중 어느 쪽인가요? (1) 답이 안 떠오른다 (2) 정해도 되는지 확신이 없다`,
      reasoning: `idle 또는 delete_burst 신호 추정. 의사결정 vs 발견의 막힘을 분리.`,
    };
  }
  return {
    guidance: "(stub) 유사 케이스가 아직 누적되지 않았습니다.",
    reasoning: "case_embeddings 미생성. 56일 후 활성.",
  };
}

async function persistGuidance(opts: {
  responseId: string;
  userId: string;
  kind: GuidanceKind;
  model: string;
  guidance: string;
  reasoning: string;
}) {
  // service_role 로 insert (학생도 자기 row select 가능)
  const admin = createAdminClient();
  await admin.from("ai_guidance").insert({
    response_id: opts.responseId,
    user_id: opts.userId,
    kind: opts.kind,
    model: opts.model,
    guidance: opts.guidance,
    reasoning: opts.reasoning,
  });
}
