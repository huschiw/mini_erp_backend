import { z } from "zod";

const nonNegativeInt = (field: string) =>
  z
    .number({ error: `${field} must be a number` })
    .refine((n) => Number.isFinite(n), { message: `${field} must be a number` })
    .int({ message: `${field} must be a whole number` })
    .min(0, { message: `${field} cannot be negative` });

const nonNegativeDecimal = (field: string) =>
  z
    .number({ error: `${field} must be a number` })
    .refine((n) => Number.isFinite(n), { message: `${field} must be a number` })
    .min(0, { message: `${field} cannot be negative` })
    .refine((n) => Math.abs(Math.round(n * 4) - n * 4) < 1e-8, {
      message: `${field} must use .00, .25, .50, or .75 satang`,
    });

export const productSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  categoryId: z.string().uuid("Invalid category"),
  stock: nonNegativeInt("Stock").default(0),
  minimumStock: nonNegativeInt("Minimum stock").default(0),
  costPrice: nonNegativeDecimal("Cost price"),
  sellingPrice: nonNegativeDecimal("Selling price"),
  imageUrl: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || v === "" || /^https?:\/\//.test(v), {
      message: "Image URL must be a valid URL",
    }),
});

export const productUpdateSchema = productSchema.partial();

const optionalCategoryId = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Invalid category"
    )
    .optional()
);

export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: optionalCategoryId,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
