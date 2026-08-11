import { ChallanStatus, MovementType, Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { PaginationParams, buildPageMeta } from "../../utils/pagination";
import { applyStockMovement } from "../products/product.service";

interface ChallanItemInput {
  productId: string;
  quantity: number;
}

async function generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.challan.count();
  const year = new Date().getFullYear();
  // Simple sequential number scoped by year, e.g. CH-2026-000123.
  // Uniqueness is still enforced by the DB constraint on challanNumber;
  // a retry-on-conflict strategy would be needed under heavy concurrent load.
  return `CH-${year}-${String(count + 1).padStart(6, "0")}`;
}

async function buildItemSnapshots(tx: Prisma.TransactionClient, items: ChallanItemInput[]) {
  const productIds = items.map((i) => i.productId);
  const products = await tx.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw ApiError.badRequest(`Product ${item.productId} does not exist`);
    }
    return {
      productId: product.id,
      productNameSnapshot: product.name,
      productSkuSnapshot: product.sku,
      unitPriceSnapshot: product.unitPrice,
      quantity: item.quantity,
    };
  });
}

export interface ListChallanFilters {
  status?: ChallanStatus;
  customerId?: string;
}

export async function listChallans(filters: ListChallanFilters, pagination: PaginationParams) {
  const where: Prisma.ChallanWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include: { customer: { select: { id: true, name: true, businessName: true } }, items: true },
    }),
    prisma.challan.count({ where }),
  ]);

  return { items, meta: buildPageMeta(total, pagination) };
}

export async function getChallanById(id: string) {
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!challan) throw ApiError.notFound("Challan not found");
  return challan;
}

// Creates a challan as DRAFT or directly CONFIRMED.
// If CONFIRMED is requested and any line item has insufficient stock, the
// entire operation (challan + items + stock movements) is rolled back and
// a 400 is returned - nothing is persisted.
export async function createChallan(
  customerId: string,
  items: ChallanItemInput[],
  status: "DRAFT" | "CONFIRMED",
  createdById: string
) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw ApiError.badRequest("Customer does not exist");

    const itemData = await buildItemSnapshots(tx, items);
    const totalQuantity = itemData.reduce((sum, i) => sum + i.quantity, 0);
    const challanNumber = await generateChallanNumber(tx);

    const challan = await tx.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        status: ChallanStatus.DRAFT,
        createdById,
        items: { create: itemData },
      },
      include: { items: true, customer: true },
    });

    if (status === "CONFIRMED") {
      for (const item of itemData) {
        await applyStockMovement(
          item.productId,
          item.quantity,
          MovementType.OUT,
          `Sales challan ${challan.challanNumber} confirmed`,
          createdById,
          tx
        );
      }
      return tx.challan.update({
        where: { id: challan.id },
        data: { status: ChallanStatus.CONFIRMED, confirmedAt: new Date() },
        include: { items: true, customer: true },
      });
    }

    return challan;
  });
}

// Draft-only edit: replace the line items and recompute totals.
export async function updateChallan(id: string, customerId: string | undefined, items: ChallanItemInput[] | undefined) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.challan.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Challan not found");
    if (existing.status !== ChallanStatus.DRAFT) {
      throw ApiError.badRequest("Only draft challans can be edited. Confirmed or cancelled challans are final.");
    }

    let itemData;
    let totalQuantity = existing.totalQuantity;
    if (items) {
      itemData = await buildItemSnapshots(tx, items);
      totalQuantity = itemData.reduce((sum, i) => sum + i.quantity, 0);
      await tx.challanItem.deleteMany({ where: { challanId: id } });
    }

    return tx.challan.update({
      where: { id },
      data: {
        ...(customerId ? { customerId } : {}),
        totalQuantity,
        ...(itemData ? { items: { create: itemData } } : {}),
      },
      include: { items: true, customer: true },
    });
  });
}

// Confirms a draft challan: reduces stock for every line item atomically.
// Stock is never allowed to go negative - applyStockMovement throws (and the
// whole transaction rolls back) the moment any item has insufficient stock.
export async function confirmChallan(id: string, confirmedById: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) throw ApiError.notFound("Challan not found");
    if (challan.status !== ChallanStatus.DRAFT) {
      throw ApiError.badRequest(`Only draft challans can be confirmed (current status: ${challan.status})`);
    }

    for (const item of challan.items) {
      await applyStockMovement(
        item.productId,
        item.quantity,
        MovementType.OUT,
        `Sales challan ${challan.challanNumber} confirmed`,
        confirmedById,
        tx
      );
    }

    return tx.challan.update({
      where: { id },
      data: { status: ChallanStatus.CONFIRMED, confirmedAt: new Date() },
      include: { items: true, customer: true },
    });
  });
}

// Cancels a challan. If it was already confirmed, stock is reversed (added back).
export async function cancelChallan(id: string, cancelledById: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) throw ApiError.notFound("Challan not found");
    if (challan.status === ChallanStatus.CANCELLED) {
      throw ApiError.badRequest("Challan is already cancelled");
    }

    if (challan.status === ChallanStatus.CONFIRMED) {
      for (const item of challan.items) {
        await applyStockMovement(
          item.productId,
          item.quantity,
          MovementType.IN,
          `Sales challan ${challan.challanNumber} cancelled - stock reversed`,
          cancelledById,
          tx
        );
      }
    }

    return tx.challan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED, cancelledAt: new Date() },
      include: { items: true, customer: true },
    });
  });
}
