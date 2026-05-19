import { NextResponse } from "next/server";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const allowedOrigins = FRONTEND_URL.split(",")
  .map((url) => url.trim())
  .filter(Boolean);

function isAllowedOrigin(origin?: string | null | undefined) {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return (
      (protocol === "https:" && hostname.endsWith(".vercel.app")) ||
      (protocol === "http:" &&
        (hostname === "localhost" || hostname === "127.0.0.1"))
    );
  } catch {
    return false;
  }
}

export function corsHeaders(origin?: string | null | undefined) {
  const allowed =
    isAllowedOrigin(origin) && origin
      ? origin
      : (allowedOrigins[0] ?? "http://localhost:3000");
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function withCors(response: NextResponse, origin?: string | null) {
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function corsOptionsResponse(origin?: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
