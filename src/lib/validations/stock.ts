import { StockOutReason } from "@prisma/client";
import { z } from "zod";

const positiveInt = (field: string) =>
  z
    .number({ error: `${field} must be a number` })
    .refine((n) => Number.isFinite(n), { message: `${field} must be a number` })
    .int({ message: `${field} must be a whole number` })
    .min(1, { message: `${field} must be at least 1` });

export const stockInSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  quantity: positiveInt("Quantity"),
  supplier: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const stockOutSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  quantity: positiveInt("Quantity"),
  reason: z.enum(StockOutReason),
  note: z.string().optional().nullable(),
});

export const movementQuerySchema = z.object({
  productId: z.string().uuid("Invalid product").optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
