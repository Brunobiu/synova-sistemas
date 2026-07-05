import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@synova/database";
import { decideAccess, isProtectedPath } from "@/lib/auth-rules";

function redirectToLogin(req: NextRequest) {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase ainda não configurado: bloqueia áreas protegidas por segurança.
  if (!url || !anon) {
    return isProtectedPath(pathname) ? redirectToLogin(req) : NextResponse.next();
  }

  let res = NextResponse.next({ request: req });
  const supabase = createSupabaseServerClient({
    getAll: () => req.cookies.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
      res = NextResponse.next({ request: req });
      cookiesToSet.forEach(({ name, value, options }) =>
        res.cookies.set(name, value, options),
      );
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (decideAccess(pathname, Boolean(user)) === "redirect-login") {
    return redirectToLogin(req);
  }
  return res;
}

export const config = {
  matcher: ["/erp/:path*", "/meu-atendimento/:path*", "/api/admin/:path*"],
};
