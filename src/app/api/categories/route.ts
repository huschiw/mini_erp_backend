import { Role } from "@prisma/client";
import { getSessionUser, requireRole } from "@/lib/auth";
import {
  jsonError,
  jsonForbidden,
  jsonOk,
  jsonUnauthorized,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations/category";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return jsonOk(categories);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();
  if (!requireRole(user, [Role.ADMIN])) return jsonForbidden();

  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const category = await prisma.category.create({ data: parsed.data });
    return jsonOk(category, 201);
  } catch {
    return jsonError("Failed to create category", 500);
  }
}
