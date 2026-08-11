import { Router } from "express";
import { Role } from "@prisma/client";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { loginSchema, registerSchema } from "./auth.schema";
import { loginHandler, registerHandler, meHandler } from "./auth.controller";

const router = Router();

// POST /auth/login - public
router.post("/login", validate(loginSchema), asyncHandler(loginHandler));

// POST /auth/register - Admin only, used to provision accounts for the 4 roles
router.post(
  "/register",
  requireAuth,
  requireRole(Role.ADMIN),
  validate(registerSchema),
  asyncHandler(registerHandler)
);

// GET /auth/me - any authenticated user
router.get("/me", requireAuth, asyncHandler(meHandler));

export default router;
