"use server";

/**
 * 담벼락 생성 Server Action. 로그인 필수.
 * createWall() 호출 후 새 담벼락으로 리다이렉트.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createWall } from "@/server/walls/queries";
import { env } from "@/lib/env";
import { DEFAULT_COVER_COLOR, WALL_COLORS } from "@/components/wall/wall-constants";

const VALID_COLORS = new Set(WALL_COLORS.map((c) => c.value));

export async function createWallAction(formData: FormData) {
  if (!env.supabase.isConfigured) {
    redirect(
      "/wall/new?error=" +
        encodeURIComponent("Supabase가 설정되지 않았습니다. .env.local 확인."),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/wall/new");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const coverRaw = String(formData.get("cover_color") ?? "");
  const cover_color = VALID_COLORS.has(coverRaw) ? coverRaw : DEFAULT_COVER_COLOR;

  if (!title) {
    redirect("/wall/new?error=" + encodeURIComponent("담벼락 이름을 입력하십시오."));
  }
  if (title.length > 120) {
    redirect("/wall/new?error=" + encodeURIComponent("이름은 120자 이내로 입력하십시오."));
  }

  const wall = await createWall({
    title,
    description: description || null,
    owner_id: user.id,
    cover_color,
  });

  if (!wall) {
    redirect(
      "/wall/new?error=" + encodeURIComponent("담벼락 생성에 실패했습니다. 다시 시도해 주세요."),
    );
  }

  redirect("/wall/" + wall.slug);
}
