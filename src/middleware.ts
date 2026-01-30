// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "tikd_preview_gate";
const COOKIE_VALUE = "1";

function isPublicPath(pathname: string) {
  // Allow Next internals / static files / public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return true;
  }

  // Allow common public assets you may have in /public
  if (
    pathname.startsWith("/assets/") ||
    pathname === "/Logo.svg" ||
    pathname === "/logo.svg"
  ) {
    return true;
  }

  // Allow the gate page itself
  if (pathname.startsWith("/gate")) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  // already unlocked?
  const gate = req.cookies.get(COOKIE_NAME)?.value;
  if (gate === COOKIE_VALUE) return NextResponse.next();

  // redirect to gate with return url
  const next = `${pathname}${search ?? ""}`;
  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.searchParams.set("next", next);

  return NextResponse.redirect(url);
}

// Run for everything (we early-return for public paths above)
export const config = {
  matcher: ["/:path*"],
};
