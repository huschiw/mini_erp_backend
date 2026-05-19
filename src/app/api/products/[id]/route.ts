import { Prisma, Role } from "@prisma/client";
import { getSessionUser, requireRole } from "@/lib/auth";
import {
  jsonError,
  jsonForbidden,
  jsonOk,
  jsonUnauthorized,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { productUpdateSchema } from "@/lib/validations/product";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();
  if (!requireRole(user, [Role.ADMIN])) return jsonForbidden();

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { imageUrl, barcode, ...rest } = parsed.data;
    const data: Prisma.ProductUpdateInput = { ...rest };

    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
    if (barcode !== undefined) data.barcode = barcode || null;
    if (rest.costPrice !== undefined) data.costPrice = rest.costPrice;
    if (rest.sellingPrice !== undefined) data.sellingPrice = rest.sellingPrice;

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });

    return jsonOk(product);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("SKU or barcode already exists", 409);
    }
    return jsonError("Product not found or update failed", 404);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();
  if (!requireRole(user, [Role.ADMIN])) return jsonForbidden();

  const { id } = await params;

  try {
    await prisma.product.delete({ where: { id } });
    return jsonOk({ message: "Product deleted" });
  } catch {
    return jsonError("Product not found", 404);
  }
}
