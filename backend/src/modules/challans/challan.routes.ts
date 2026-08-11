import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { createChallanSchema, updateChallanSchema, listChallanSchema, challanIdParamSchema } from "./challan.schema";
import {
  listChallansHandler,
  getChallanHandler,
  createChallanHandler,
  updateChallanHandler,
  confirmChallanHandler,
  cancelChallanHandler,
} from "./challan.controller";

const router = Router();

// All authenticated roles can view challans (Warehouse needs to see confirmed
// ones to fulfil, Accounts needs them for invoicing). Only Admin & Sales
// create/edit/confirm/cancel them.
router.use(requireAuth);

router.get("/", validate(listChallanSchema), asyncHandler(listChallansHandler));
router.get("/:id", validate(challanIdParamSchema), asyncHandler(getChallanHandler));

router.post(
  "/",
  requireRole(Role.ADMIN, Role.SALES),
  validate(createChallanSchema),
  asyncHandler(createChallanHandler)
);

router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.SALES),
  validate(updateChallanSchema),
  asyncHandler(updateChallanHandler)
);

router.post(
  "/:id/confirm",
  requireRole(Role.ADMIN, Role.SALES),
  validate(challanIdParamSchema),
  asyncHandler(confirmChallanHandler)
);

router.post(
  "/:id/cancel",
  requireRole(Role.ADMIN, Role.SALES),
  validate(challanIdParamSchema),
  asyncHandler(cancelChallanHandler)
);

export default router;
