import { NextResponse } from "next/server";

export function corsHeaders(origin?: string | null, allowed = true) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, DELETE",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Bulle-Site-Key, X-Bulle-Admin-Secret",
  };

  if (origin && allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return headers;
}

export function jsonWithCors<T>(
  data: T,
  init?: ResponseInit & { origin?: string | null; allowed?: boolean }
) {
  const { origin, allowed = true, ...responseInit } = init ?? {};
  return NextResponse.json(data, {
    ...responseInit,
    headers: {
      ...corsHeaders(origin, allowed),
      ...(responseInit.headers ?? {}),
    },
  });
}

export function optionsResponse(
  origin?: string | null,
  allowed = true
) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin, allowed),
  });
}

export function rateLimitResponse(
  origin: string | null | undefined,
  retryAfterSec: number,
  allowed = true
) {
  return jsonWithCors(
    { error: "Trop de requêtes, réessayez plus tard." },
    {
      status: 429,
      origin,
      allowed,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}
