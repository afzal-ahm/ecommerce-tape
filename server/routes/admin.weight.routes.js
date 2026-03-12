import express from "express";
import { prisma } from "../config/db.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();
// using shared `prisma` from `config/db.js`

// Get all weights
router.get("/weights", isAdmin, async (req, res) => {
  try {
    const weights = await prisma.weight.findMany({
      orderBy: [{ value: "asc" }],
    });

    return res.status(200).json({
      success: true,
      message: "Weights fetched successfully",
      data: { weights },
    });
  } catch (error) {
    console.error("Error fetching weights:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch weights",
      error: error.message,
    });
  }
});

// Get a weight by ID
router.get("/weights/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const weight = await prisma.weight.findUnique({
      where: { id },
    });

    if (!weight) {
      return res.status(404).json({
        success: false,
        message: "Weight not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Weight fetched successfully",
      data: { weight },
    });
  } catch (error) {
    console.error("Error fetching weight:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch weight",
      error: error.message,
    });
  }
});

// Create a new weight
router.post("/weights", isAdmin, async (req, res) => {
  try {
    const { value, unit } = req.body;

    if (!value || !unit) {
      return res.status(400).json({
        success: false,
        message: "Value and unit are required",
      });
    }

    const valueNumber = parseFloat(value);

    if (isNaN(valueNumber) || valueNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Value must be a positive number",
      });
    }

    // Check if weight with the same value and unit exists
    const existingWeight = await prisma.weight.findFirst({
      where: {
        value: valueNumber,
        unit,
      },
    });

    if (existingWeight) {
      return res.status(400).json({
        success: false,
        message: "A weight with this value and unit already exists",
      });
    }

    // Create weight
    const newWeight = await prisma.weight.create({
      data: {
        value: valueNumber,
        unit,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Weight created successfully",
      data: { weight: newWeight },
    });
  } catch (error) {
    console.error("Error creating weight:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create weight",
      error: error.message,
    });
  }
});

// Update a weight
router.patch("/weights/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { value, unit } = req.body;

    // Check if weight exists
    const existingWeight = await prisma.weight.findUnique({
      where: { id },
    });

    if (!existingWeight) {
      return res.status(404).json({
        success: false,
        message: "Weight not found",
      });
    }

    const updateData = {};

    if (value !== undefined) {
      const valueNumber = parseFloat(value);

      if (isNaN(valueNumber) || valueNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: "Value must be a positive number",
        });
      }

      updateData.value = valueNumber;
    }

    if (unit !== undefined) {
      updateData.unit = unit;
    }

    // Check if another weight with the same value and unit exists
    if (Object.keys(updateData).length > 0) {
      const checkValue =
        updateData.value !== undefined
          ? updateData.value
          : existingWeight.value;
      const checkUnit =
        updateData.unit !== undefined ? updateData.unit : existingWeight.unit;

      const duplicateWeight = await prisma.weight.findFirst({
        where: {
          value: checkValue,
          unit: checkUnit,
          id: { not: id },
        },
      });

      if (duplicateWeight) {
        return res.status(400).json({
          success: false,
          message: "A weight with this value and unit already exists",
        });
      }
    }

    // Check if weight is used in any product variant
    const variantsUsingWeight = await prisma.productVariant.count({
      where: { weightId: id },
    });

    if (variantsUsingWeight > 0 && Object.keys(updateData).length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot update weight. It is being used by ${variantsUsingWeight} product variants.`,
      });
    }

    // Update weight
    const updatedWeight = await prisma.weight.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Weight updated successfully",
      data: { weight: updatedWeight },
    });
  } catch (error) {
    console.error("Error updating weight:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update weight",
      error: error.message,
    });
  }
});

// Delete a weight
router.delete("/weights/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if weight exists
    const weight = await prisma.weight.findUnique({
      where: { id },
    });

    if (!weight) {
      return res.status(404).json({
        success: false,
        message: "Weight not found",
      });
    }

    // Check if weight is used in any product variant
    const variantsUsingWeight = await prisma.productVariant.count({
      where: { weightId: id },
    });

    if (variantsUsingWeight > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete weight. It is being used by ${variantsUsingWeight} product variants.`,
      });
    }

    // Delete weight
    await prisma.weight.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Weight deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting weight:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete weight",
      error: error.message,
    });
  }
});

export default router;
