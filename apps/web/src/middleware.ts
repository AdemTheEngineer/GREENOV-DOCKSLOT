import { AUTH_COOKIE_NAME } from "@dockslot/shared";
import { NextResponse, type NextRequest } from "next/server";

// UX guard only: real authorization is enforced by the API on every request.
export function middleware(request: NextRequest) {
  if (request.cookies.has(AUTH_COOKIE_NAME)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
