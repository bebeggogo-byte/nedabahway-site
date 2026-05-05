"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function signInAction(formData: FormData) {
  if (!env.supabase.isConfigured) {
    redirect("/login?error=" + encodeURIComponent("Supabase가 설정되지 않았습니다. .env.local 확인."));
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("이메일과 비밀번호를 입력하십시오."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent("로그인 실패: " + error.message));
  }

  redirect(redirectTo);
}
