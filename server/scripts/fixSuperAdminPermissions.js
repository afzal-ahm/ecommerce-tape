import dotenv from "dotenv";
import { prisma } from "../config/db.js";

// Load environment variables
dotenv.config();

async function fixSuperAdminPermissions() {
  try {
    // Get all super admins instead of looking for a specific ID
    const superAdmins = await prisma.admin.findMany({
      where: { role: "SUPER_ADMIN" },
      include: {
        permissions: true,
      },
    });

    if (superAdmins.length === 0) {
      console.error("No SUPER_ADMIN found!");
      return;
    }

    for (const admin of superAdmins) {
      // Define ALL permissions that a SUPER_ADMIN should have, following exactly the route configuration
      const allSuperAdminPermissions = [
        // Admin management
        { resource: "admins", action: "create" },
        { resource: "admins", action: "read" },
        { resource: "admins", action: "update" },
        { resource: "admins", action: "delete" },

        // User management
        { resource: "users", action: "create" },
        { resource: "users", action: "read" },
        { resource: "users", action: "update" },
        { resource: "users", action: "delete" },

        // Products management
        { resource: "products", action: "create" },
        { resource: "products", action: "read" },
        { resource: "products", action: "update" },
        { resource: "products", action: "delete" },

        // Orders management
        { resource: "orders", action: "create" },
        { resource: "orders", action: "read" },
        { resource: "orders", action: "update" },
        { resource: "orders", action: "delete" },

        // Categories management
        { resource: "categories", action: "create" },
        { resource: "categories", action: "read" },
        { resource: "categories", action: "update" },
        { resource: "categories", action: "delete" },

        // Reviews management
        { resource: "reviews", action: "create" },
        { resource: "reviews", action: "read" },
        { resource: "reviews", action: "update" },
        { resource: "reviews", action: "delete" },

        // Settings management
        { resource: "settings", action: "read" },
        { resource: "settings", action: "update" },

        // Inventory management
        { resource: "inventory", action: "create" },
        { resource: "inventory", action: "read" },
        { resource: "inventory", action: "update" },
        { resource: "inventory", action: "delete" },

        // Coupons management
        { resource: "coupons", action: "create" },
        { resource: "coupons", action: "read" },
        { resource: "coupons", action: "update" },
        { resource: "coupons", action: "delete" },

        // color management
        { resource: "color", action: "create" },
        { resource: "color", action: "read" },
        { resource: "color", action: "update" },
        { resource: "color", action: "delete" },

        // size management
        { resource: "size", action: "create" },
        { resource: "size", action: "read" },
        { resource: "size", action: "update" },
        { resource: "size", action: "delete" },

        // Dashboard
        { resource: "dashboard", action: "read" },
      ];

      // Create a record of existing permissions
      const existingPermissions = admin.permissions.map(
        (p) => `${p.resource}:${p.action}`
      );

      // Track how many permissions were added
      let addedCount = 0;

      // Add each missing permission
      for (const permission of allSuperAdminPermissions) {
        const permString = `${permission.resource}:${permission.action}`;

        // Skip if permission already exists
        if (existingPermissions.includes(permString)) {
          continue;
        }

        // Add the permission
        await prisma.permission.create({
          data: {
            adminId: admin.id,
            resource: permission.resource,
            action: permission.action,
          },
        });

        addedCount++;
      }
    }
  } catch (error) {
    console.error("Error fixing permissions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSuperAdminPermissions();
