import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Chemins accessibles sans authentification :
// - /login et son API : évidemment nécessaire pour pouvoir se connecter
// - /public/* : réservé aux pages destinées aux candidats eux-mêmes
//   (ex: accepter/refuser un entretien depuis un lien reçu par email),
//   qui n'ont pas de compte et ne doivent pas en avoir besoin.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];
const PUBLIC_PREFIXES = ["/public", "/api/public", "/_next", "/favicon", "/api/cron"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  const session = await getSessionFromRequest(req);

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};