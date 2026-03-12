import express from "express";
import { prisma } from "../config/db.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3client from "../utils/s3client.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { isAdmin, hasPermission } from "../middlewares/auth.middleware.js";

const router = express.Router();
// using shared `prisma` from `config/db.js`

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Get all flavors
router.get("/flavors", isAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let where = {};

    if (search) {
      where = {
        name: {
          contains: search,
          mode: "insensitive",
        },
      };
    }

    const flavors = await prisma.flavor.findMany({
      where,
      orderBy: { name: "asc" },
    });

    // Add complete image URLs to flavors
    const flavorsWithImageUrls = flavors.map((flavor) => ({
      ...flavor,
      image: flavor.image ? getFileUrl(flavor.image) : null,
    }));

    return res.status(200).json({
      success: true,
      message: "Flavors fetched successfully",
      data: { flavors: flavorsWithImageUrls },
    });
  } catch (error) {
    console.error("Error fetching flavors:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch flavors",
      error: error.message,
    });
  }
});

// Get a flavor by ID
router.get("/flavors/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const flavor = await prisma.flavor.findUnique({
      where: { id },
    });

    if (!flavor) {
      return res.status(404).json({
        success: false,
        message: "Flavor not found",
      });
    }

    // Add complete image URL to flavor
    const flavorWithImageUrl = {
      ...flavor,
      image: flavor.image ? getFileUrl(flavor.image) : null,
    };

    return res.status(200).json({
      success: true,
      message: "Flavor fetched successfully",
      data: { flavor: flavorWithImageUrl },
    });
  } catch (error) {
    console.error("Error fetching flavor:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch flavor",
      error: error.message,
    });
  }
});

// Create a new flavor
router.post("/flavors", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if flavor with the same name exists
    const existingFlavor = await prisma.flavor.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existingFlavor) {
      return res.status(400).json({
        success: false,
        message: "A flavor with this name already exists",
      });
    }

    let imageKey = null;

    // Upload image to S3 if provided
    if (req.file) {
      // Use the upload folder from environment variable for consistency
      const uploadFolder = process.env.UPLOAD_FOLDER || "ecom-uploads";
      imageKey = `${uploadFolder}/flavors/${uuidv4()}-${req.file.originalname.replace(
        /\s+/g,
        "-"
      )}`;

      await s3client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: imageKey,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ACL: "public-read",
        })
      );
    }

    // Create flavor
    const newFlavor = await prisma.flavor.create({
      data: {
        name,
        description,
        image: imageKey,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Flavor created successfully",
      data: {
        flavor: {
          ...newFlavor,
          image: imageKey ? getFileUrl(imageKey) : null,
        },
      },
    });
  } catch (error) {
    console.error("Error creating flavor:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create flavor",
      error: error.message,
    });
  }
});

// Update a flavor
router.patch(
  "/flavors/:id",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Check if flavor exists
      const existingFlavor = await prisma.flavor.findUnique({
        where: { id },
      });

      if (!existingFlavor) {
        return res.status(404).json({
          success: false,
          message: "Flavor not found",
        });
      }

      // Check if another flavor with the same name exists
      if (name) {
        const duplicateFlavor = await prisma.flavor.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            id: { not: id },
          },
        });

        if (duplicateFlavor) {
          return res.status(400).json({
            success: false,
            message: "A flavor with this name already exists",
          });
        }
      }

      // Prepare update data
      const updateData = {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      };

      // Handle image update
      let imageKey = existingFlavor.image;

      if (req.file) {
        // Delete old image if it exists
        if (existingFlavor.image) {
          await deleteFromS3(existingFlavor.image);
        }

        // Upload new image using the environment variable
        const uploadFolder = process.env.UPLOAD_FOLDER || "ecom-uploads";
        imageKey = `${uploadFolder}/flavors/${uuidv4()}-${req.file.originalname.replace(
          /\s+/g,
          "-"
        )}`;

        await s3client.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: imageKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: "public-read",
          })
        );

        updateData.image = imageKey;
      }

      // Update flavor
      const updatedFlavor = await prisma.flavor.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: "Flavor updated successfully",
        data: {
          flavor: {
            ...updatedFlavor,
            image: updatedFlavor.image ? getFileUrl(updatedFlavor.image) : null,
          },
        },
      });
    } catch (error) {
      console.error("Error updating flavor:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update flavor",
        error: error.message,
      });
    }
  }
);

// Delete a flavor
router.delete("/flavors/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if flavor exists
    const flavor = await prisma.flavor.findUnique({
      where: { id },
    });

    if (!flavor) {
      return res.status(404).json({
        success: false,
        message: "Flavor not found",
      });
    }

    // Check if flavor is used in any product variant
    const variantsUsingFlavor = await prisma.productVariant.count({
      where: { flavorId: id },
    });

    if (variantsUsingFlavor > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete flavor. It is being used by ${variantsUsingFlavor} product variants.`,
      });
    }

    // Delete image from S3 if it exists
    if (flavor.image) {
      await deleteFromS3(flavor.image);
    }

    // Delete flavor
    await prisma.flavor.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Flavor deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting flavor:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete flavor",
      error: error.message,
    });
  }
});

export default router;
