import { Request, Response } from "express";
import { ChallanStatus } from "@prisma/client";
import * as challanService from "./challan.service";
import { getPagination } from "../../utils/pagination";

export async function listChallansHandler(req: Request, res: Response) {
  const pagination = getPagination(req);
  const { status, customerId } = req.query;

  const result = await challanService.listChallans(
    { status: status as ChallanStatus | undefined, customerId: customerId as string | undefined },
    pagination
  );

  res.status(200).json(result);
}

export async function getChallanHandler(req: Request, res: Response) {
  const challan = await challanService.getChallanById(req.params.id);
  res.status(200).json({ challan });
}

export async function createChallanHandler(req: Request, res: Response) {
  const { customerId, items, status } = req.body;
  const challan = await challanService.createChallan(customerId, items, status, req.user!.sub);
  res.status(201).json({ challan });
}

export async function updateChallanHandler(req: Request, res: Response) {
  const { customerId, items } = req.body;
  const challan = await challanService.updateChallan(req.params.id, customerId, items);
  res.status(200).json({ challan });
}

export async function confirmChallanHandler(req: Request, res: Response) {
  const challan = await challanService.confirmChallan(req.params.id, req.user!.sub);
  res.status(200).json({ challan });
}

export async function cancelChallanHandler(req: Request, res: Response) {
  const challan = await challanService.cancelChallan(req.params.id, req.user!.sub);
  res.status(200).json({ challan });
}
