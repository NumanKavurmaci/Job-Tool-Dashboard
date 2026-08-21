import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, no-transform",
  Pragma: "no-cache",
} as const;

const LOOPBACK_HOSTNAMES = new Set(["localhost", "localhost.", "127.0.0.1", "[::1]", "::1"]);

function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
}

function readHostHeader(request: Request): URL | null {
  const host = request.headers.get("host");
  if (!host) {
    return null;
  }

  try {
    return new URL(`http://${host}`);
  } catch {
    return null;
  }
}

export function guardMutationRequest(request: Request): NextResponse | null {
  const requestUrl = new URL(request.url);
  const hostHeader = readHostHeader(request);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (!isLoopbackHostname(requestUrl.hostname)) {
    return jsonNoStore({ error: "Dashboard mutations are only available on the loopback interface." }, { status: 403 });
  }

  if (request.headers.has("host") && (!hostHeader || !isLoopbackHostname(hostHeader.hostname))) {
    return jsonNoStore({ error: "The request Host must resolve to a loopback address." }, { status: 403 });
  }

  if (origin) {
    try {
      if (new URL(origin).origin !== requestUrl.origin) {
        return jsonNoStore({ error: "Cross-origin dashboard mutations are not allowed." }, { status: 403 });
      }
    } catch {
      return jsonNoStore({ error: "The request Origin is invalid." }, { status: 403 });
    }
  }

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return jsonNoStore({ error: "Cross-site dashboard mutations are not allowed." }, { status: 403 });
  }

  return null;
}

export function jsonNoStore(body: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    headers.set(key, value);
  }

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}
