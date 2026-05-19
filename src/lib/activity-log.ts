import { ActivityType } from "@prisma/client";
import { prisma } from "./prisma";

export interface ActivityLogInput {
  userId: string;
  type: ActivityType;
  entityType?: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity(input: ActivityLogInput) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId,
        type: input.type,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        description: input.description,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    // Log to console but don't throw to avoid breaking main operations
    console.error("Failed to log activity:", error);
  }
}

// Helper functions for common activities
export async function logLogin(
  userId: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logActivity({
    userId,
    type: ActivityType.LOGIN,
    description: `User ${userName} logged in`,
    ipAddress,
    userAgent,
  });
}

export async function logCreate(
  userId: string,
  userName: string,
  entityType: string,
  entityId: string,
  entityName: string,
  ipAddress?: string
) {
  await logActivity({
    userId,
    type: ActivityType.CREATE,
    entityType,
    entityId,
    description: `User ${userName} created ${entityType.toLowerCase()} "${entityName}"`,
    ipAddress,
    metadata: { entityName },
  });
}

export async function logUpdate(
  userId: string,
  userName: string,
  entityType: string,
  entityId: string,
  entityName: string,
  changes?: Record<string, { old: unknown; new: unknown }>,
  ipAddress?: string
) {
  await logActivity({
    userId,
    type: ActivityType.UPDATE,
    entityType,
    entityId,
    description: `User ${userName} updated ${entityType.toLowerCase()} "${entityName}"`,
    ipAddress,
    metadata: { entityName, changes },
  });
}

export async function logDelete(
  userId: string,
  userName: string,
  entityType: string,
  entityId: string,
  entityName: string,
  ipAddress?: string
) {
  await logActivity({
    userId,
    type: ActivityType.DELETE,
    entityType,
    entityId,
    description: `User ${userName} deleted ${entityType.toLowerCase()} "${entityName}"`,
    ipAddress,
    metadata: { entityName },
  });
}

export async function logStockIn(
  userId: string,
  userName: string,
  productName: string,
  quantity: number,
  stockInId: string,
  ipAddress?: string
) {
  await logActivity({
    userId,
    type: ActivityType.STOCK_IN,
    entityType: "StockIn",
    entityId: stockInId,
    description: `User ${userName} received ${quantity} units of "${productName}"`,
    ipAddress,
    metadata: { productName, quantity },
  });
}

export async function logStockOut(
  userId: string,
  userName: string,
  productName: string,
  quantity: number,
  reason: string,
  stockOutId: string,
  ipAddress?: string
) {
  await logActivity({
    userId,
    type: ActivityType.STOCK_OUT,
    entityType: "StockOut",
    entityId: stockOutId,
    description: `User ${userName} issued ${quantity} units of "${productName}" (${reason})`,
    ipAddress,
    metadata: { productName, quantity, reason },
  });
}
