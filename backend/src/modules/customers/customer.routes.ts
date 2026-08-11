import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomerSchema,
  addFollowUpSchema,
} from "./customer.schema";
import {
  listCustomersHandler,
  getCustomerHandler,
  createCustomerHandler,
  updateCustomerHandler,
  addFollowUpHandler,
} from "./customer.controller";

const router = Router();

// All roles can view customers (Accounts/Warehouse may need to look one up),
// only Admin & Sales can create/edit/manage CRM follow-ups.
router.use(requireAuth);

router.get("/", validate(listCustomerSchema), asyncHandler(listCustomersHandler));
router.get("/:id", asyncHandler(getCustomerHandler));

router.post(
  "/",
  requireRole(Role.ADMIN, Role.SALES),
  validate(createCustomerSchema),
  asyncHandler(createCustomerHandler)
);

router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.SALES),
  validate(updateCustomerSchema),
  asyncHandler(updateCustomerHandler)
);

router.post(
  "/:id/follow-ups",
  requireRole(Role.ADMIN, Role.SALES),
  validate(addFollowUpSchema),
  asyncHandler(addFollowUpHandler)
);

export default router;
