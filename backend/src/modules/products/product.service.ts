import { Prisma, MovementType } from "@prisma/client";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { PaginationParams, buildPageMeta } from "../../utils/pagination";

export interface ListProductsFilters {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}

export async function listProducts(filters: ListProductsFilters, pagination: PaginationParams) {
  const where: Prisma.ProductWhereInput = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { sku: { contains: filters.search, mode: "insensitive" } },
            { category: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [allMatching, total] = await Promise.all([
    filters.lowStockOnly
      ? prisma.product.findMany({ where, orderBy: { createdAt: "desc" } })
      : prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
    prisma.product.count({ where }),
  ]);

  // Low-stock filtering needs a field-to-field comparison Prisma can't express
  // directly in `where`, so it's applied in application code, then paginated.
  const items = filters.lowStockOnly
    ? allMatching.filter((p) => p.currentStock <= p.minStockAlert).slice(pagination.skip, pagination.skip + pagination.take)
    : allMatching;

  const effectiveTotal = filters.lowStockOnly
    ? allMatching.filter((p) => p.currentStock <= p.minStockAlert).length
    : total;

  return { items, meta: buildPageMeta(effectiveTotal, pagination) };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { stockMovements: { orderBy: { createdAt: "desc" }, take: 20, include: { createdBy: { select: { name: true } } } } },
  });
  if (!product) throw ApiError.notFound("Product not found");
  return product;
}

export async function createProduct(
  data: Omit<Prisma.ProductCreateInput, "currentStock">,
  openingStock: number,
  createdById: string
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: { ...data, currentStock: openingStock },
    });

    if (openingStock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          quantityChanged: openingStock,
          movementType: MovementType.IN,
          reason: "Opening stock",
          createdById,
        },
      });
    }

    return product;
  });
}

export async function updateProduct(id: string, data: Prisma.ProductUpdateInput) {
  await getProductById(id);
  return prisma.product.update({ where: { id }, data });
}

// Shared by the manual "adjust stock" endpoint and the challan confirm flow.
// Runs inside the caller's transaction when `tx` is provided, so stock
// deductions from a confirmed challan are atomic with the challan update.
export async function applyStockMovement(
  productId: string,
  quantity: number,
  movementType: MovementType,
  reason: string,
  createdById: string,
  tx: Prisma.TransactionClient = prisma
) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound(`Product ${productId} not found`);

  const delta = movementType === "IN" ? quantity : -quantity;
  const newStock = product.currentStock + delta;

  if (newStock < 0) {
    throw ApiError.badRequest(
      `Insufficient stock for "${product.name}" (SKU ${product.sku}). Available: ${product.currentStock}, requested: ${quantity}.`
    );
  }

  const updated = await tx.product.update({ where: { id: productId }, data: { currentStock: newStock } });

  await tx.stockMovement.create({
    data: { productId, quantityChanged: quantity, movementType, reason, createdById },
  });

  return updated;
}

export async function recordStockMovement(
  productId: string,
  quantity: number,
  movementType: MovementType,
  reason: string,
  createdById: string
) {
  return prisma.$transaction((tx) => applyStockMovement(productId, quantity, movementType, reason, createdById, tx));
}
