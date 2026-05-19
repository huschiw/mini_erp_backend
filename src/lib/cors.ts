import { NextResponse } from "next/server";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const allowedOrigins = FRONTEND_URL.split(",").map((url) => url.trim());

export function corsHeaders(origin?: string | null) {
  const allowed =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function withCors(response: NextResponse, origin?: string | null) {
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
