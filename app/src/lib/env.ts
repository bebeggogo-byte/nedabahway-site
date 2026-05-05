/**
 * 환경변수 단일 출처 + 타입 가드.
 * 누락 시 즉시 에러 (dev) 또는 fallback (prod).
 */

const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const env = {
  supabase: {
    url: PUBLIC_SUPABASE_URL ?? "",
    anonKey: PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    dbUrl: process.env.SUPABASE_DB_URL ?? "",
    isConfigured: Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY),
  },
  site: {
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  },
  toss: {
    clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "",
    secretKey: process.env.TOSS_SECRET_KEY ?? "",
    isConfigured: Boolean(
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY && process.env.TOSS_SECRET_KEY
    ),
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7",
    isConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  },
  voyage: {
    apiKey: process.env.VOYAGE_API_KEY ?? "",
    isConfigured: Boolean(process.env.VOYAGE_API_KEY),
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? "",
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "[email protected]",
    isConfigured: Boolean(process.env.RESEND_API_KEY),
  },
  oauth: {
    googleEnabled:
      process.env.NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED === "true",
    kakaoEnabled: process.env.NEXT_PUBLIC_OAUTH_KAKAO_ENABLED === "true",
  },
} as const;

/**
 * 서버에서 호출 시 supabase가 설정 안 됐으면 에러.
 * 클라이언트에서는 isConfigured로 체크.
 */
export function requireSupabase(): {
  url: string;
  anonKey: string;
} {
  if (!env.supabase.isConfigured) {
    throw new Error(
      "[env] Supabase가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY 두 개 키를 채우십시오."
    );
  }
  return {
    url: env.supabase.url,
    anonKey: env.supabase.anonKey,
  };
}
