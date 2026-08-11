import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { createProductSchema, updateProductSchema, listProductSchema, stockMovementSchema } from "./product.schema";
import {
  listProductsHandler,
  getProductHandler,
  createProductHandler,
  updateProductHandler,
  recordStockMovementHandler,
} from "./product.controller";

const router = Router();

// All authenticated roles can view products/stock.
// Only Admin & Warehouse can create/edit products or record stock movements.
router.use(requireAuth);

router.get("/", validate(listProductSchema), asyncHandler(listProductsHandler));
router.get("/:id", asyncHandler(getProductHandler));

router.post(
  "/",
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  validate(createProductSchema),
  asyncHandler(createProductHandler)
);

router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  validate(updateProductSchema),
  asyncHandler(updateProductHandler)
);

router.post(
  "/:id/stock-movements",
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  validate(stockMovementSchema),
  asyncHandler(recordStockMovementHandler)
);

export default router;
