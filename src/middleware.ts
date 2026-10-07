import { NextResponse, type NextRequest } from "next/server";

// Passes the requested path to server components (the authenticated layout
// uses it to build the sign-in callbackUrl). No auth logic here: the layout
// and the APIs check the session themselves.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
