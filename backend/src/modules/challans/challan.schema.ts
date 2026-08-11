import { z } from "zod";
import { ChallanStatus } from "@prisma/client";

const challanItemSchema = z.object({
  productId: z.string().uuid("A valid product is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
});

export const createChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid("A valid customer is required"),
    items: z.array(challanItemSchema).min(1, "At least one product line is required"),
    status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
  }),
});

export const updateChallanSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    customerId: z.string().uuid().optional(),
    items: z.array(challanItemSchema).min(1).optional(),
  }),
});

export const listChallanSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    status: z.nativeEnum(ChallanStatus).optional(),
    customerId: z.string().uuid().optional(),
  }),
});

export const challanIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
