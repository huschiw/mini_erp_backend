import { createToken, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { logLogin } from "@/lib/activity-log";
import { corsHeaders } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const response = jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
      const response = jsonError("Invalid email or password", 401);
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = await createToken(sessionUser);

    // Log the login activity
    const ipAddress = request.headers.get("x-forwarded-for") ?? undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;
    await logLogin(user.id, user.name, ipAddress, userAgent);

    const response = jsonOk({
      user: sessionUser,
      token,
    });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    const response = jsonError("Login failed", 500);
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}
