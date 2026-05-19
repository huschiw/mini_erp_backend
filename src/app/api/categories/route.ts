import { Role } from "@prisma/client";
import { getSessionUser, requireRole } from "@/lib/auth";
import {
  jsonError,
  jsonForbidden,
  jsonOk,
  jsonUnauthorized,
} from "@/lib/api-response";
import { corsOptionsResponse } from "@/lib/cors";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations/category";
import { NextRequest } from "next/server";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsOptionsResponse(origin);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized(origin);

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return jsonOk(categories, 200, origin);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized(origin);
  if (!requireRole(user, [Role.ADMIN])) return jsonForbidden(origin);

  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400, origin);
    }

    const category = await prisma.category.create({ data: parsed.data });
    return jsonOk(category, 201, origin);
  } catch {
    return jsonError("Failed to create category", 500, origin);
  }
}
