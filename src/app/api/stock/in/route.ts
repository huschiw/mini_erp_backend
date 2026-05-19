import { InventoryMovementType } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { stockInSchema } from "@/lib/validations/stock";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();

  try {
    const body = await request.json();
    const parsed = stockInSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { productId, quantity, supplier, invoiceNumber, note } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");

      const beforeStock = product.stock;
      const afterStock = beforeStock + quantity;

      const stockIn = await tx.stockIn.create({
        data: {
          productId,
          quantity,
          supplier: supplier || null,
          invoiceNumber: invoiceNumber || null,
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
          type: InventoryMovementType.STOCK_IN,
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

      return { stockIn, movement };
    });

    return jsonOk(result, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return jsonError("Product not found", 404);
    }
    return jsonError("Failed to receive stock", 500);
  }
}
