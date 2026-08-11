import { Request, Response } from "express";
import { CustomerStatus, CustomerType } from "@prisma/client";
import * as customerService from "./customer.service";
import { getPagination } from "../../utils/pagination";

export async function listCustomersHandler(req: Request, res: Response) {
  const pagination = getPagination(req);
  const { search, status, customerType } = req.query;

  const result = await customerService.listCustomers(
    {
      search: search as string | undefined,
      status: status as CustomerStatus | undefined,
      customerType: customerType as CustomerType | undefined,
    },
    pagination
  );

  res.status(200).json(result);
}

export async function getCustomerHandler(req: Request, res: Response) {
  const customer = await customerService.getCustomerById(req.params.id);
  res.status(200).json({ customer });
}

export async function createCustomerHandler(req: Request, res: Response) {
  const customer = await customerService.createCustomer(req.body);
  res.status(201).json({ customer });
}

export async function updateCustomerHandler(req: Request, res: Response) {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  res.status(200).json({ customer });
}

export async function addFollowUpHandler(req: Request, res: Response) {
  const { note, followUpDate } = req.body;
  const followUp = await customerService.addFollowUp(req.params.id, note, followUpDate, req.user!.sub);
  res.status(201).json({ followUp });
}
