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
  const isLoginPage = path === "/admin/login";
  const isAdminPage = path.startsWith("/admin");
  const isMfgPage = path.startsWith("/manufacturing");
  const isPortalPage = path.startsWith("/portal");

  // Not logged in — send to login
  if (!session && (isAdminPage && !isLoginPage || isMfgPage || isPortalPage)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Already logged in — skip login page
  if (isLoginPage && session) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  if (session) {
    const role = (session.user.app_metadata?.role as string) ?? "standard";
    const isElevated = role === "admin" || role === "manager";

    // Standard users can only access /manufacturing and /portal
    if (!isElevated && isAdminPage && !isLoginPage) {
      return NextResponse.redirect(new URL("/manufacturing", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/manufacturing/:path*", "/portal/:path*", "/portal"],
};
