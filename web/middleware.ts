import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() returns auth failures rather than throwing. On a dead refresh
  // token the client has already cleared the session cookies onto
  // supabaseResponse; on a network failure it leaves them alone and returns a
  // retryable error instead.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Could not reach Supabase. This says nothing about whether the session is
  // valid, so it must not be treated as "signed out".
  //
  // UNVERIFIED: this branch has never been observed to fire. auth-js logs the
  // retryable fetch error internally and then surfaces AuthSessionMissingError
  // to the caller, so `error` was not retryable in any case reproduced so far.
  // And even if it did fire, /dashboard would still bounce to login:
  // app/dashboard/page.tsx:66 does its own unguarded getUser() and redirects on
  // !user. (/admin is unaffected — it fails closed here regardless.)
  // Treat this as defensive, not proven.
  const supabaseUnreachable = !!authError && isAuthRetryableFetchError(authError);
  if (supabaseUnreachable) {
    console.error("[middleware] Supabase unreachable:", authError.message);
  }

  // A fresh NextResponse does not inherit the cookies Supabase wrote onto
  // supabaseResponse — including the cleared ones. Without copying them across,
  // a stale cookie survives every redirect and the request loops.
  const redirectTo = (url: URL) => {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  const loginRedirect = (pathname: string) => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname);
    return redirectTo(loginUrl);
  };

  const { pathname } = request.nextUrl;

  // Protect /dashboard
  if (!user && !supabaseUnreachable && pathname.startsWith("/dashboard")) {
    return loginRedirect(pathname);
  }

  // Protect /admin — must be authenticated and have role = 'admin'
  if (pathname.startsWith("/admin")) {
    if (!user) {
      // During an outage the role cannot be verified, so fail closed — but
      // send them home rather than to login, which would imply a dead session
      // and discard a perfectly good one.
      if (supabaseUnreachable) return redirectTo(new URL("/", request.url));
      return loginRedirect(pathname);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return redirectTo(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
