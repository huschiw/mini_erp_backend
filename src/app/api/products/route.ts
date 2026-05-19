import { Prisma, Role } from "@prisma/client";
import { getSessionUser, requireRole } from "@/lib/auth";
import {
  jsonError,
  jsonForbidden,
  jsonOk,
  jsonUnauthorized,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { productQuerySchema, productSchema } from "@/lib/validations/product";
import { logCreate } from "@/lib/activity-log";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();

  const { searchParams } = new URL(request.url);
  const parsed = productQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    page: searchParams.get("page") ?? 1,
    limit: searchParams.get("limit") ?? 10,
  });

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid query", 400);
  }

  const { search, categoryId, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  return jsonOk({
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized();
  if (!requireRole(user, [Role.ADMIN])) return jsonForbidden();

  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { imageUrl, barcode, ...rest } = parsed.data;

    const product = await prisma.product.create({
      data: {
        ...rest,
        barcode: barcode || null,
        imageUrl: imageUrl || null,
        costPrice: rest.costPrice,
        sellingPrice: rest.sellingPrice,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    // Log activity
    const ipAddress = request.headers.get("x-forwarded-for") ?? undefined;
    await logCreate(user.id, user.name, "Product", product.id, product.name, ipAddress);

    return jsonOk(product, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("SKU or barcode already exists", 409);
    }
    return jsonError("Failed to create product", 500);
  }
}
