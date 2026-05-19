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
import { categoryUpdateSchema } from "@/lib/validations/category";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsOptionsResponse(origin);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const origin = request.headers.get("origin") ?? undefined;
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized(origin);
  if (!requireRole(user, [Role.ADMIN])) return jsonForbidden(origin);

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400, origin);
    }

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });
    return jsonOk(category, 200, origin);
  } catch {
    return jsonError("Category not found or update failed", 404, origin);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const origin = request.headers.get("origin") ?? undefined;
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized(origin);
  if (!requireRole(user, [Role.ADMIN])) return jsonForbidden(origin);

  const { id } = await params;

  try {
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return jsonError("Cannot delete category with existing products", 400, origin);
    }

    await prisma.category.delete({ where: { id } });
    return jsonOk({ message: "Category deleted" }, 200, origin);
  } catch {
    return jsonError("Category not found", 404, origin);
  }
}
