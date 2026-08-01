import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request and gates access:
 * unauthenticated users are sent to /login; logged-in users can't sit on the
 * auth pages.
 *
 * Session cookies written during refresh must be copied onto redirect
 * responses — otherwise the browser never receives the refreshed tokens and
 * the next request loops (or drops the session).
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch {
    // Transient Auth failures must not 500 every matched path (including /login).
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password";
  // Password-recovery links land here with a session from the email token —
  // allow both signed-out and signed-in users through.
  const isRecoveryPage = path === "/update-password";
  const isAuthCallback = path === "/auth/callback";

  const copySessionCookies = (target: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((c) => {
      target.cookies.set(c);
    });
    return target;
  };

  if (!user && !isAuthPage && !isRecoveryPage && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return copySessionCookies(NextResponse.redirect(url));
  }
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/quotes";
    return copySessionCookies(NextResponse.redirect(url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|webp|jpg|jpeg|gif|ico)$).*)",
  ],
};
