import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { movementQuerySchema } from "@/lib/validations/stock";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();

  const { searchParams } = new URL(request.url);
  const parsed = movementQuerySchema.safeParse({
    productId: searchParams.get("productId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    page: searchParams.get("page") ?? 1,
    limit: searchParams.get("limit") ?? 20,
  });

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid query", 400);
  }

  const { productId, from, to, page, limit } = parsed.data;
  const skip = (page - 1) * limit;
  const where: Prisma.InventoryMovementWhereInput = {};

  if (productId) where.productId = productId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [movements, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.inventoryMovement.count({ where }),
  ]);

  return jsonOk({
    data: movements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
