import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@erp.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@erp.com",
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const staffHash = await bcrypt.hash("staff123", 10);
  await prisma.user.upsert({
    where: { email: "staff@erp.com" },
    update: {},
    create: {
      name: "Staff User",
      email: "staff@erp.com",
      password: staffHash,
      role: Role.STAFF,
    },
  });

  const electronics = await prisma.category.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Electronics",
      description: "Electronic devices and accessories",
    },
  });

  const office = await prisma.category.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Office Supplies",
      description: "Stationery and office equipment",
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      sku: "SKU-001",
      barcode: "8901234567890",
      name: "Wireless Mouse",
      description: "Ergonomic wireless mouse",
      categoryId: electronics.id,
      stock: 50,
      minimumStock: 10,
      costPrice: 15.0,
      sellingPrice: 29.50,
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-002" },
    update: {},
    create: {
      sku: "SKU-002",
      barcode: "8901234567891",
      name: "A4 Notebook",
      description: "200-page ruled notebook",
      categoryId: office.id,
      stock: 5,
      minimumStock: 20,
      costPrice: 2.5,
      sellingPrice: 5.25,
    },
  });

  console.log("Seed complete:", { admin: admin.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
