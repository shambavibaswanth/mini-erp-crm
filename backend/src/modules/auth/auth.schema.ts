import { z } from "zod";
import { Role } from "@prisma/client";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("A valid email is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("A valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.nativeEnum(Role),
  }),
});
