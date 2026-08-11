import "dotenv/config";
import { PrismaClient, Role, CustomerType, CustomerStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password123!", 10);

  const users = [
    { name: "Admin User", email: "admin@example.com", role: Role.ADMIN },
    { name: "Sales User", email: "sales@example.com", role: Role.SALES },
    { name: "Warehouse User", email: "warehouse@example.com", role: Role.WAREHOUSE },
    { name: "Accounts User", email: "accounts@example.com", role: Role.ACCOUNTS },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.com" } });

  let customer = await prisma.customer.findFirst({ where: { mobile: "9876543210" } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: "Ramesh Traders",
        mobile: "9876543210",
        email: "ramesh@traders.com",
        businessName: "Ramesh Traders Pvt Ltd",
        customerType: CustomerType.WHOLESALE,
        address: "MG Road, Bengaluru",
        status: CustomerStatus.ACTIVE,
        notes: "Key wholesale account, seeded for demo.",
      },
    });
  }

  const product = await prisma.product.upsert({
    where: { sku: "SKU-DEMO-001" },
    update: {},
    create: {
      name: "Demo Steel Rod 10mm",
      sku: "SKU-DEMO-001",
      category: "Steel",
      unitPrice: 450.0,
      currentStock: 200,
      minStockAlert: 20,
      location: "Warehouse A",
    },
  });

  await prisma.stockMovement.create({
    data: {
      productId: product.id,
      quantityChanged: 200,
      movementType: "IN",
      reason: "Initial stock (seed)",
      createdById: admin.id,
    },
  });

  console.log("Seed complete.");
  console.log("Login credentials (all roles use password: Password123!):");
  users.forEach((u) => console.log(`  ${u.role}: ${u.email}`));
  console.log(`Seed customer: ${customer.name} (${customer.id})`);
  console.log(`Seed product: ${product.name} (${product.sku})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
