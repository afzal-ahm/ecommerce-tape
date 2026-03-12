import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Create a pg Pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with the adapter
export const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
  transactionOptions: {
    maxWait: 30000,
    timeout: 120000,
  },
});
