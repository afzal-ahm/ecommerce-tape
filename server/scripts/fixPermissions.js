import dotenv from "dotenv";
import { prisma } from "../config/db.js";

// Load environment variables
dotenv.config();

async function fixPermissions() {
  try {
    // Get all admins
    const admins = await prisma.admin.findMany({
      where: {
        role: {
          in: ["ADMIN", "MANAGER"],
        },
      },
      include: {
        permissions: true,
      },
    });

    if (admins.length === 0) {
      console.error("No ADMIN or MANAGER users found!");
      return;
    }

    for (const admin of admins) {
      // Define the missing permissions we want to add based on role
      let missingPermissions = [];

      if (admin.role === "ADMIN") {
        missingPermissions = [
          { resource: "inventory", action: "create" },
          { resource: "inventory", action: "read" },
          { resource: "inventory", action: "update" },
          { resource: "inventory", action: "delete" },
          { resource: "coupons", action: "create" },
          { resource: "coupons", action: "read" },
          { resource: "coupons", action: "update" },
          { resource: "flavors", action: "create" },
          { resource: "flavors", action: "read" },
          { resource: "flavors", action: "update" },
          { resource: "weights", action: "create" },
          { resource: "weights", action: "read" },
          { resource: "weights", action: "update" },
        ];
      } else if (admin.role === "MANAGER") {
        missingPermissions = [
          { resource: "inventory", action: "create" },
          { resource: "inventory", action: "read" },
          { resource: "coupons", action: "read" },
          { resource: "flavors", action: "read" },
          { resource: "weights", action: "read" },
        ];
      }

      // Create a record of existing permissions
      const existingPermissions = admin.permissions.map(
        (p) => `${p.resource}:${p.action}`
      );

      // Track how many permissions were added
      let addedCount = 0;

      // Add each missing permission
      for (const permission of missingPermissions) {
        const permString = `${permission.resource}:${permission.action}`;

        // Skip if permission already exists
        if (existingPermissions.includes(permString)) {
          continue;
        }

        // Add the permission using the correct table name
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

    console.log("Permission fix completed successfully!");
  } catch (error) {
    console.error("Error fixing permissions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPermissions();
