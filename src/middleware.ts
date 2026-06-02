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
  const isWorkshopPage = path.startsWith("/workshop");
  const isPortalPage = path.startsWith("/portal");

  if ((isAdminPage && !isLoginPage && !session) || (isWorkshopPage && !session) || (isPortalPage && !session)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isLoginPage && session) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/workshop/:path*", "/portal/:path*", "/portal"],
};
