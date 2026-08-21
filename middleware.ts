import { NextRequest, NextResponse } from "next/server";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "localhost.", "127.0.0.1", "[::1]", "::1"]);

function isLoopbackRequest(request: NextRequest): boolean {
  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  try {
    return LOOPBACK_HOSTNAMES.has(new URL(`http://${host}`).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (!isLoopbackRequest(request)) {
    return new NextResponse("Dashboard access is limited to this computer.", {
      status: 403,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
