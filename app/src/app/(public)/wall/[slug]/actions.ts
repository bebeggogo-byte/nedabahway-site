"use server";

/**
 * 담벼락 설정 Server Action — 기여 잠금 토글.
 * 소유자만 실행 가능 (RLS가 소유권 강제).
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWallBySlug, updateWall } from "@/server/walls/queries";
import { env } from "@/lib/env";

export async function toggleLockAction(formData: FormData) {
  if (!env.supabase.isConfigured) return;

  const slug = String(formData.get("slug") ?? "").trim();
  const locked = String(formData.get("locked") ?? "") === "true";
  if (!slug) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const wall = await getWallBySlug(slug);
  if (!wall || wall.owner_id !== user.id) return;

  await updateWall(wall.id, { contributions_locked: locked });
  revalidatePath(`/wall/${slug}`);
}
