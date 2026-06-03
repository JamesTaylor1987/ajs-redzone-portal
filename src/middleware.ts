import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { session } } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;
  const isAdminLoginPage = path === "/admin/login";
  const isAdminPage = path.startsWith("/admin");
  const isMfgPage = path.startsWith("/manufacturing");
  const isPortalPage = path.startsWith("/portal");
  const isRZLoginPage = path === "/redzone/login";
  const isRZPage = path.startsWith("/redzone") && !isRZLoginPage;

  // Not logged in — send to appropriate login
  if (!session) {
    if (isAdminPage && !isAdminLoginPage || isMfgPage || isPortalPage) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (isRZPage) {
      return NextResponse.redirect(new URL("/redzone/login", request.url));
    }
  }

  // Already logged in — skip login pages
  if (session) {
    const role = (session.user.app_metadata?.role as string) ?? "standard";
    const isElevated = role === "admin" || role === "manager";
    const isRZPM = role === "rz_pm";

    if (isAdminLoginPage) {
      return NextResponse.redirect(new URL(isRZPM ? "/redzone/quotes" : "/portal", request.url));
    }
    if (isRZLoginPage) {
      return NextResponse.redirect(new URL(isRZPM ? "/redzone/quotes" : "/portal", request.url));
    }

    // Standard users can only access /manufacturing and /portal
    if (!isElevated && !isRZPM && isAdminPage && !isAdminLoginPage) {
      return NextResponse.redirect(new URL("/manufacturing", request.url));
    }

    // RZ PMs can only access /redzone — not admin or manufacturing
    if (isRZPM && (isAdminPage || isMfgPage)) {
      return NextResponse.redirect(new URL("/redzone/quotes", request.url));
    }

    // Non-RZ PMs cannot access /redzone portal pages
    if (!isRZPM && isRZPage) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/manufacturing/:path*", "/portal/:path*", "/portal", "/auth/:path*", "/redzone/:path*"],
};
