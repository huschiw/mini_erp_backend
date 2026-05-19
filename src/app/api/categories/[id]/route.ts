import { Role } from "@prisma/client";
import { getSessionUser, requireRole } from "@/lib/auth";
import {
  jsonError,
  jsonForbidden,
  jsonOk,
  jsonUnauthorized,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { categoryUpdateSchema } from "@/lib/validations/category";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();
  if (!requireRole(user, [Role.ADMIN])) return jsonForbidden();

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });
    return jsonOk(category);
  } catch {
    return jsonError("Category not found or update failed", 404);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();
  if (!requireRole(user, [Role.ADMIN])) return jsonForbidden();

  const { id } = await params;

  try {
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return jsonError("Cannot delete category with existing products", 400);
    }

    await prisma.category.delete({ where: { id } });
    return jsonOk({ message: "Category deleted" });
  } catch {
    return jsonError("Category not found", 404);
  }
}
