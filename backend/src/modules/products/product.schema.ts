import { z } from "zod";

const productBody = {
  name: z.string().min(2, "Product name is required"),
  sku: z.string().min(1, "SKU/code is required"),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative"),
  minStockAlert: z.coerce.number().int().nonnegative().default(0),
  location: z.string().optional(),
};

export const createProductSchema = z.object({
  body: z.object({
    ...productBody,
    // Optional opening stock; recorded as an initial IN movement.
    openingStock: z.coerce.number().int().nonnegative().default(0),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object(productBody).partial(),
});

export const listProductSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    lowStockOnly: z.string().optional(),
  }),
});

export const stockMovementSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
    movementType: z.enum(["IN", "OUT"]),
    reason: z.string().min(1, "A reason is required for every stock movement"),
  }),
});
