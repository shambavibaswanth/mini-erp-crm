import { apiClient } from "./client";

// ---------- Types ----------
export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  customerType: CustomerType;
  address?: string | null;
  status: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  followUps?: CustomerNote[];
  challans?: Challan[];
}

export interface CustomerNote {
  id: string;
  note: string;
  followUpDate?: string | null;
  createdAt: string;
  createdBy?: { name: string };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: string | number;
  currentStock: number;
  minStockAlert: number;
  location?: string | null;
  createdAt: string;
  stockMovements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  quantityChanged: number;
  movementType: "IN" | "OUT";
  reason: string;
  createdAt: string;
  createdBy?: { name: string };
}

export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface ChallanItem {
  id?: string;
  productId: string;
  quantity: number;
  productNameSnapshot?: string;
  productSkuSnapshot?: string;
  unitPriceSnapshot?: string | number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  customer: Customer;
  items: ChallanItem[];
  createdBy?: { name: string; email: string };
}

interface Paginated<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

// ---------- Auth ----------
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string; user: User }>("/auth/login", { email, password }),
  me: () => apiClient.get<{ user: User }>("/auth/me"),
  register: (data: { name: string; email: string; password: string; role: Role }) =>
    apiClient.post<{ user: User }>("/auth/register", data),
};

// ---------- Customers ----------
export const customerApi = {
  list: (params: { search?: string; status?: string; page?: number; pageSize?: number }) =>
    apiClient.get<Paginated<Customer>>("/customers", { params }),
  get: (id: string) => apiClient.get<{ customer: Customer }>(`/customers/${id}`),
  create: (data: Partial<Customer>) => apiClient.post<{ customer: Customer }>("/customers", data),
  update: (id: string, data: Partial<Customer>) => apiClient.patch<{ customer: Customer }>(`/customers/${id}`, data),
  addFollowUp: (id: string, note: string, followUpDate?: string) =>
    apiClient.post<{ followUp: CustomerNote }>(`/customers/${id}/follow-ups`, { note, followUpDate }),
};

// ---------- Products ----------
export const productApi = {
  list: (params: { search?: string; lowStockOnly?: boolean; page?: number; pageSize?: number }) =>
    apiClient.get<Paginated<Product>>("/products", { params }),
  get: (id: string) => apiClient.get<{ product: Product }>(`/products/${id}`),
  create: (data: Partial<Product> & { openingStock?: number }) =>
    apiClient.post<{ product: Product }>("/products", data),
  update: (id: string, data: Partial<Product>) => apiClient.patch<{ product: Product }>(`/products/${id}`, data),
  recordMovement: (id: string, data: { quantity: number; movementType: "IN" | "OUT"; reason: string }) =>
    apiClient.post<{ product: Product }>(`/products/${id}/stock-movements`, data),
};

// ---------- Challans ----------
export const challanApi = {
  list: (params: { status?: string; customerId?: string; page?: number; pageSize?: number }) =>
    apiClient.get<Paginated<Challan>>("/challans", { params }),
  get: (id: string) => apiClient.get<{ challan: Challan }>(`/challans/${id}`),
  create: (data: { customerId: string; items: { productId: string; quantity: number }[]; status: "DRAFT" | "CONFIRMED" }) =>
    apiClient.post<{ challan: Challan }>("/challans", data),
  update: (id: string, data: { customerId?: string; items?: { productId: string; quantity: number }[] }) =>
    apiClient.patch<{ challan: Challan }>(`/challans/${id}`, data),
  confirm: (id: string) => apiClient.post<{ challan: Challan }>(`/challans/${id}/confirm`),
  cancel: (id: string) => apiClient.post<{ challan: Challan }>(`/challans/${id}/cancel`),
};
