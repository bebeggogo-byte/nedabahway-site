/**
 * POST /api/wall/upload
 * multipart 파일 업로드 — 익명 게스트도 사용.
 *
 * - form-data: file (필수), wallId (필수)
 * - 이미지(jpg/png/webp/gif) 와 문서/파일(pdf/doc/docx/ppt/pptx/hwp/zip) 허용
 * - 10MB 상한
 * - createAdminClient() 로 wall-media 버킷에 업로드 (service_role → RLS 우회)
 *   경로: {wallId}/{uuid}-{safeName}
 * - 인메모리 per-IP rate limit (60초당 10회)
 * - 응답: { url, name, size }  (public URL)
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { clientIp, checkRateLimit } from "@/server/walls/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "wall-media";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/** 허용 MIME → 확장자 매핑 (이미지 + 문서/압축) */
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/x-hwp": "hwp",
  "application/haansofthwp": "hwp",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

const wallIdSchema = z.string().uuid();

/** 파일명을 안전하게 정규화 — 한글·공백·특수문자 제거, 길이 제한 */
function safeFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return cleaned || "file";
}

export async function POST(req: NextRequest) {
  if (!env.supabase.isConfigured) {
    return NextResponse.json({ error: "Supabase 설정 누락" }, { status: 500 });
  }

  // rate limit
  const ip = clientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주십시오." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const wallIdRaw = String(form.get("wallId") ?? "");
  if (!wallIdSchema.safeParse(wallIdRaw).success) {
    return NextResponse.json({ error: "invalid_wall_id" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", message: "파일은 10MB 이하만 업로드할 수 있습니다." },
      { status: 413 },
    );
  }

  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      {
        error: "unsupported_type",
        message: "허용되지 않는 파일 형식입니다. (이미지 또는 문서/압축 파일만 가능)",
      },
      { status: 415 },
    );
  }

  // {wallId}/{uuid}-{safeName}.{ext}
  const objectPath = `${wallIdRaw}/${crypto.randomUUID()}-${safeFileName(file.name)}.${ext}`;

  // service_role 클라이언트 — RLS 우회로 게스트 업로드 처리
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    console.error("[walls] upload 실패", uploadErr);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(objectPath);

  return NextResponse.json(
    { url: publicUrl, name: file.name, size: file.size },
    { status: 201 },
  );
}
