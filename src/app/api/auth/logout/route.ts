import { getSessionUser } from "@/lib/auth";
import { jsonOk, jsonUnauthorized } from "@/lib/api-response";
import { corsOptionsResponse } from "@/lib/cors";
import { NextRequest } from "next/server";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsOptionsResponse(origin);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const user = await getSessionUser(request);
  if (!user) {
    return jsonUnauthorized(origin);
  }
  return jsonOk({ message: "Logged out successfully" }, 200, origin);
}
