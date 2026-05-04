"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function signUpAction(formData: FormData) {
  if (!env.supabase.isConfigured) {
    redirect("/signup?error=" + encodeURIComponent("Supabase가 설정되지 않았습니다."));
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !password || !displayName) {
    redirect("/signup?error=" + encodeURIComponent("모든 항목을 입력하십시오."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${env.site.url}/auth/callback`,
    },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent("가입 실패: " + error.message));
  }

  if (data.user) {
    // profiles 자동 생성 (학생 디폴트). RLS는 self insert 허용.
    await supabase.from("profiles").upsert({
      id: data.user.id,
      display_name: displayName,
      role: "student",
    });
  }

  redirect("/signup?ok=1");
}
