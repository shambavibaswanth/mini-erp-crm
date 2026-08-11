import { z } from "zod";
import { CustomerStatus, CustomerType } from "@prisma/client";

const customerBody = {
  name: z.string().min(2, "Customer name is required"),
  mobile: z.string().min(6, "A valid mobile number is required"),
  email: z.string().email().optional().or(z.literal("")),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.nativeEnum(CustomerType).default(CustomerType.RETAIL),
  address: z.string().optional(),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
};

export const createCustomerSchema = z.object({
  body: z.object(customerBody),
});

export const updateCustomerSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object(customerBody).partial(),
});

export const listCustomerSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    customerType: z.nativeEnum(CustomerType).optional(),
  }),
});

export const addFollowUpSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    note: z.string().min(1, "Note text is required"),
    followUpDate: z.coerce.date().optional(),
  }),
});
