import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api-response";
import { corsOptionsResponse } from "@/lib/cors";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsOptionsResponse(origin);
}

const querySchema = z.object({
  userId: z.string().uuid().optional(),
  type: z.enum(["LOGIN", "CREATE", "UPDATE", "DELETE", "STOCK_IN", "STOCK_OUT"]).optional(),
  entityType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") ?? undefined;
  const user = await getSessionUser(request);
  if (!user) return jsonUnauthorized(origin);

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    userId: searchParams.get("userId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    entityType: searchParams.get("entityType") ?? undefined,
    page: searchParams.get("page") ?? 1,
    limit: searchParams.get("limit") ?? 20,
  });

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid query", 400, origin);
  }

  const { userId, type, entityType, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.ActivityLogWhereInput = {};
  if (userId) where.userId = userId;
  if (type) where.type = type;
  if (entityType) where.entityType = entityType;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return jsonOk({
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 200, origin);
}
