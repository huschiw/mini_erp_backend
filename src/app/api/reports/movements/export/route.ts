import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonUnauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        product: { select: { sku: true, name: true } },
        creator: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // CSV Header
    const headers = [
      "Date",
      "Type",
      "Product SKU",
      "Product Name",
      "Quantity",
      "Before Stock",
      "After Stock",
      "Created By",
    ];

    // CSV Rows
    const rows = movements.map((movement) => [
      escapeCSV(movement.createdAt.toISOString()),
      escapeCSV(movement.type),
      escapeCSV(movement.product?.sku),
      escapeCSV(movement.product?.name),
      escapeCSV(movement.quantity),
      escapeCSV(movement.beforeStock),
      escapeCSV(movement.afterStock),
      escapeCSV(movement.creator?.name),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="inventory-movements.csv"',
      },
    });
  } catch {
    return jsonError("Failed to export movements", 500);
  }
}
