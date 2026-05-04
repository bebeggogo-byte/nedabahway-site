/**
 * Auth 세션 갱신 미들웨어.
 * 모든 요청에서 Supabase 쿠키를 refresh.
 */
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Supabase 미설정 시 미들웨어 우회 (5분 부팅 전 placeholder 환경 대응)
  if (!env.supabase.isConfigured) {
    return response;
  }

  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 세션 갱신 (호출 자체가 refresh 트리거)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 보호 라우트 체크
  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/sessions") ||
    path.startsWith("/outputs") ||
    path.startsWith("/enrollments") ||
    path.startsWith("/refunds") ||
    path.startsWith("/coach") ||
    path.startsWith("/teacher");

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 다음 경로 제외:
     * - _next/static, _next/image, favicon, og 이미지
     * - API 라우트는 별도 처리 (route handlers 내부에서 직접 인증)
     */
    "/((?!_next/static|_next/image|favicon.ico|og-.*\\.png|api/webhooks).*)",
  ],
};
