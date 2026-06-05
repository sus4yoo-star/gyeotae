import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * OAuth / 매직링크 콜백.
 *
 * Next.js 15 Route Handler에서 cookies를 next/headers 쪽에 쓰면 응답에
 * 자동으로 실리지 않습니다. 그래서 redirect 응답을 FIRST 만들고, Supabase
 * 클라이언트의 cookie writer가 바로 그 응답 객체에 쿠키를 쓰도록 연결합니다.
 * 이게 만나에서 "로그인 두 번 해야 함" 무한루프를 잡은 패턴입니다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/family";

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

    if (!url || !anon) {
      return NextResponse.redirect(`${origin}/login?error=config`);
    }

    const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/home`;
    const response = NextResponse.redirect(redirectTo);

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(toSet: CookieToSet[]) {
          toSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
