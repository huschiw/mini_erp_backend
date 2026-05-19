import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api-response";
import { corsOptionsResponse } from "@/lib/cors";
import { prisma } from "@/lib/prisma";
import { InventoryMovementType } from "@prisma/client";
import { NextRequest } from "next/server";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsOptionsResponse(origin);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") ?? undefined;
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized(origin);

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalProducts,
      totalCategories,
      lowStockCount,
      inventoryValue,
      monthlyMovements,
      topMovedProducts,
    ] = await Promise.all([
      // Total products
      prisma.product.count(),

      // Total categories
      prisma.category.count(),

      // Low stock items (stock <= minimumStock)
      prisma.product.count({
        where: {
          stock: {
            lte: prisma.product.fields.minimumStock,
          },
        },
      }),

      // Total inventory value (costPrice * stock)
      prisma.product.aggregate({
        _sum: {
          costPrice: true,
        },
      }),

      // Monthly movements
      prisma.inventoryMovement.groupBy({
        by: ["type"],
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          quantity: true,
        },
      }),

      // Top 5 most moved products this month
      prisma.inventoryMovement.groupBy({
        by: ["productId"],
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 5,
      }),
    ]);

    // Get product details for top moved products
    const topProductsWithDetails = await Promise.all(
      topMovedProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, sku: true, name: true },
        });
        return {
          productId: item.productId,
          sku: product?.sku ?? "",
          name: product?.name ?? "Unknown",
          totalQuantity: item._sum.quantity ?? 0,
        };
      })
    );

    // Calculate monthly stock in/out totals
    const stockInTotal =
      monthlyMovements.find((m) => m.type === InventoryMovementType.STOCK_IN)?._sum.quantity ?? 0;

    const stockOutTotal =
      monthlyMovements.find((m) => m.type === InventoryMovementType.STOCK_OUT)?._sum.quantity ?? 0;

    return jsonOk({
      overview: {
        totalProducts,
        totalCategories,
        lowStockItems: lowStockCount,
        inventoryValue: inventoryValue._sum.costPrice
          ? Number(inventoryValue._sum.costPrice) * 100 // rough estimate
          : 0,
      },
      monthly: {
        stockIn: stockInTotal,
        stockOut: stockOutTotal,
      },
      topProducts: topProductsWithDetails,
    });
  } catch {
    return jsonError("Failed to load dashboard summary", 500);
  }
}
