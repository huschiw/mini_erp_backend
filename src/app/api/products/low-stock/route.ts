import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: {
          lte: prisma.product.fields.minimumStock,
        },
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [
        {
          stock: "asc",
        },
      ],
      take: limit,
    });

    // Calculate shortage for each product
    const productsWithShortage = lowStockProducts.map((product) => ({
      ...product,
      shortage: product.minimumStock - product.stock,
    }));

    return jsonOk({
      data: productsWithShortage,
      count: productsWithShortage.length,
    });
  } catch {
    return jsonError("Failed to load low stock products", 500);
  }
}
