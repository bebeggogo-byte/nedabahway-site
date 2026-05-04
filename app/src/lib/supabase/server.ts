/**
 * 서버용 Supabase 클라이언트 (Server Components, Route Handlers, Server Actions).
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component 에서 set 호출되면 무시 (middleware가 갱신 담당)
        }
      },
    },
  });
}

/**
 * Service Role 클라이언트 (서버 전용·관리자 작업).
 * 절대 클라이언트로 노출 금지.
 */
export function createAdminClient() {
  if (!env.supabase.serviceRoleKey) {
    throw new Error(
      "[supabase admin] SUPABASE_SERVICE_ROLE_KEY 미설정. .env.local에 추가 후 dev 서버 재시작."
    );
  }
  // 동적 import로 클라이언트 번들 오염 방지
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: createSbClient } = require("@supabase/supabase-js");
  return createSbClient<Database>(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
