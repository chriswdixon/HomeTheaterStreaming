import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export const DYNAMIC_PAGE = {
  dynamic: "force-dynamic" as const,
  revalidate: 0,
  fetchCache: "force-no-store" as const,
};

export function jsonResponse(
  data: unknown,
  init?: ResponseInit,
): NextResponse {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    headers.set(key, value);
  }

  return NextResponse.json(data, {
    ...init,
    headers,
  });
}

export function fetchNoStore(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
  });
}
