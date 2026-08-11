import { Request, Response } from "express";
import * as productService from "./product.service";
import { getPagination } from "../../utils/pagination";

export async function listProductsHandler(req: Request, res: Response) {
  const pagination = getPagination(req);
  const { search, category, lowStockOnly } = req.query;

  const result = await productService.listProducts(
    {
      search: search as string | undefined,
      category: category as string | undefined,
      lowStockOnly: lowStockOnly === "true",
    },
    pagination
  );

  res.status(200).json(result);
}

export async function getProductHandler(req: Request, res: Response) {
  const product = await productService.getProductById(req.params.id);
  res.status(200).json({ product });
}

export async function createProductHandler(req: Request, res: Response) {
  const { openingStock, ...data } = req.body;
  const product = await productService.createProduct(data, openingStock ?? 0, req.user!.sub);
  res.status(201).json({ product });
}

export async function updateProductHandler(req: Request, res: Response) {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.status(200).json({ product });
}

export async function recordStockMovementHandler(req: Request, res: Response) {
  const { quantity, movementType, reason } = req.body;
  const product = await productService.recordStockMovement(req.params.id, quantity, movementType, reason, req.user!.sub);
  res.status(200).json({ product });
}
