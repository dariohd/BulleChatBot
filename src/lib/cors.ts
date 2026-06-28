import { NextResponse } from "next/server";

export function corsHeaders(origin?: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Bulle-Site-Key",
  };
}

export function jsonWithCors<T>(
  data: T,
  init?: ResponseInit & { origin?: string | null }
) {
  const { origin, ...responseInit } = init ?? {};
  return NextResponse.json(data, {
    ...responseInit,
    headers: {
      ...corsHeaders(origin),
      ...(responseInit.headers ?? {}),
    },
  });
}

export function optionsResponse(origin?: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
