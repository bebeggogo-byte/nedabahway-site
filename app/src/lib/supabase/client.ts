/**
 * 브라우저용 Supabase 클라이언트.
 * Client Components·이벤트 핸들러에서 사용.
 */
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    env.supabase.url,
    env.supabase.anonKey
  );
}
