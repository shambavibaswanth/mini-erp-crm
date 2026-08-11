import { Prisma, CustomerStatus, CustomerType } from "@prisma/client";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { PaginationParams, buildPageMeta } from "../../utils/pagination";

export interface ListCustomersFilters {
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
}

export async function listCustomers(filters: ListCustomersFilters, pagination: PaginationParams) {
  const where: Prisma.CustomerWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.customerType ? { customerType: filters.customerType } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { mobile: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { businessName: { contains: filters.search, mode: "insensitive" } },
            { gstNumber: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, meta: buildPageMeta(total, pagination) };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      followUps: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      challans: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!customer) throw ApiError.notFound("Customer not found");
  return customer;
}

export async function createCustomer(data: Prisma.CustomerCreateInput) {
  return prisma.customer.create({ data });
}

export async function updateCustomer(id: string, data: Prisma.CustomerUpdateInput) {
  await getCustomerById(id);
  return prisma.customer.update({ where: { id }, data });
}

export async function addFollowUp(
  customerId: string,
  note: string,
  followUpDate: Date | undefined,
  createdById: string
) {
  await getCustomerById(customerId);

  const [followUp] = await prisma.$transaction([
    prisma.customerNote.create({
      data: { customerId, note, followUpDate, createdById },
    }),
    // Keep the customer's "next follow-up" field in sync if a date was given.
    ...(followUpDate
      ? [prisma.customer.update({ where: { id: customerId }, data: { followUpDate } })]
      : []),
  ]);

  return followUp;
}
