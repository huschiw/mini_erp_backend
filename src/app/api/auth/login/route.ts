import { createToken, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
      return jsonError("Invalid email or password", 401);
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = await createToken(sessionUser);

    return jsonOk({
      user: sessionUser,
      token,
    });
  } catch {
    return jsonError("Login failed", 500);
  }
}
