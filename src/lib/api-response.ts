import { NextResponse, NextRequest } from "next/server";
import { corsHeaders } from "./cors";

export function jsonOk<T>(data: T, status = 200, origin?: string | null | undefined) {
  const response = NextResponse.json(data, { status });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function jsonError(message: string, status = 400, origin?: string | null | undefined) {
  const response = NextResponse.json({ error: message }, { status });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function jsonUnauthorized(message = "Unauthorized", origin?: string | null | undefined) {
  return jsonError(message, 401, origin);
}

export function jsonForbidden(message = "Forbidden", origin?: string | null | undefined) {
  return jsonError(message, 403, origin);
}

// Helper to wrap handlers with CORS
export function withCorsHandler(
  handler: (request: NextRequest, origin: string | null) => Promise<NextResponse> | NextResponse
) {
  return async function(request: NextRequest): Promise<NextResponse> {
    const origin = request.headers.get("origin");
    
    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }
    
    const response = await handler(request, origin);
    
    // Add CORS headers to response
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}
