import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonUnauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();

  try {
    const products = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // CSV Header
    const headers = [
      "SKU",
      "Barcode",
      "Name",
      "Description",
      "Category",
      "Stock",
      "Minimum Stock",
      "Cost Price",
      "Selling Price",
      "Image URL",
      "Created At",
    ];

    // CSV Rows
    const rows = products.map((product) => [
      escapeCSV(product.sku),
      escapeCSV(product.barcode),
      escapeCSV(product.name),
      escapeCSV(product.description),
      escapeCSV(product.category?.name),
      escapeCSV(product.stock),
      escapeCSV(product.minimumStock),
      escapeCSV(product.costPrice),
      escapeCSV(product.sellingPrice),
      escapeCSV(product.imageUrl),
      escapeCSV(product.createdAt.toISOString()),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="products.csv"',
      },
    });
  } catch {
    return jsonError("Failed to export products", 500);
  }
}
