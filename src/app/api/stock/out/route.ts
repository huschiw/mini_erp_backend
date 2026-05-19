import { InventoryMovementType } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { stockOutSchema } from "@/lib/validations/stock";
import { logStockOut } from "@/lib/activity-log";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();

  try {
    const body = await request.json();
    const parsed = stockOutSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { productId, quantity, reason, note } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      if (product.stock < quantity) throw new Error("INSUFFICIENT_STOCK");

      const beforeStock = product.stock;
      const afterStock = beforeStock - quantity;

      const stockOut = await tx.stockOut.create({
        data: {
          productId,
          quantity,
          reason,
          note: note || null,
          createdBy: user.id,
        },
        include: { product: { select: { id: true, sku: true, name: true } } },
      });

      await tx.product.update({
        where: { id: productId },
        data: { stock: afterStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId,
          type: InventoryMovementType.STOCK_OUT,
          quantity,
          beforeStock,
          afterStock,
          createdBy: user.id,
        },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      });

      return { stockOut, movement };
    });

    // Log activity
    const ipAddress = request.headers.get("x-forwarded-for") ?? undefined;
    await logStockOut(
      user.id,
      user.name,
      result.stockOut.product.name,
      result.stockOut.quantity,
      result.stockOut.reason,
      result.stockOut.id,
      ipAddress
    );

    return jsonOk(result, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return jsonError("Product not found", 404);
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return jsonError("Quantity cannot exceed current stock", 400);
    }
    return jsonError("Failed to issue stock", 500);
  }
}
