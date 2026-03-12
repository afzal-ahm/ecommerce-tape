import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";

// Get all values for an attribute
export const getAttributeValuesByAttribute = asyncHandler(
  async (req, res, next) => {
    const { attributeId } = req.params;

    // Check if attribute exists
    const attribute = await prisma.attribute.findUnique({
      where: { id: attributeId },
    });

    if (!attribute) {
      throw new ApiError(404, "Attribute not found");
    }

    const values = await prisma.attributeValue.findMany({
      where: {
        attributeId,
      },
      orderBy: {
        value: "asc",
      },
    });

    // Format values with image URLs
    const formattedValues = values.map((val) => ({
      ...val,
      image: val.image ? getFileUrl(val.image) : null,
    }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { values: formattedValues },
        "Attribute values fetched successfully"
      )
    );
  }
);

// Get attribute value by ID
export const getAttributeValueById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const value = await prisma.attributeValue.findUnique({
    where: { id },
    include: {
      attribute: true,
    },
  });

  if (!value) {
    throw new ApiError(404, "Attribute value not found");
  }

  // Format value with image URL
  const formattedValue = {
    ...value,
    image: value.image ? getFileUrl(value.image) : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(200, { value: formattedValue }, "Attribute value fetched successfully")
    );
});

// Create attribute value
export const createAttributeValue = asyncHandler(async (req, res, next) => {
  const { attributeId } = req.params;
  const { value, hexCode } = req.body;

  // Validation
  if (!value) {
    throw new ApiError(400, "Value is required");
  }

  // Check if attribute exists
  const attribute = await prisma.attribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) {
    throw new ApiError(404, "Attribute not found");
  }

  // Check if value already exists for this attribute
  const existingValue = await prisma.attributeValue.findUnique({
    where: {
      attributeId_value: {
        attributeId,
        value,
      },
    },
  });

  if (existingValue) {
    throw new ApiError(400, "This value already exists for this attribute");
  }

  // Handle image upload if provided
  let imageUrl = null;
  if (req.file) {
    try {
      imageUrl = await processAndUploadImage(req.file, "attribute-values");
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new ApiError(500, "Failed to upload image");
    }
  }

  const attributeValue = await prisma.attributeValue.create({
    data: {
      attributeId,
      value,
      hexCode: hexCode || null,
      image: imageUrl,
    },
    include: {
      attribute: true,
    },
  });

  // Format response with image URL
  const formattedValue = {
    ...attributeValue,
    image: attributeValue.image ? getFileUrl(attributeValue.image) : null,
  };

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { value: formattedValue },
        "Attribute value created successfully"
      )
    );
});

// Update attribute value
export const updateAttributeValue = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { value, hexCode } = req.body;

  // Check if attribute value exists
  const existingValue = await prisma.attributeValue.findUnique({
    where: { id },
    include: {
      attribute: true,
    },
  });

  if (!existingValue) {
    throw new ApiError(404, "Attribute value not found");
  }

  // Validation
  if (!value) {
    throw new ApiError(400, "Value is required");
  }

  // Check for duplicate value if value is being updated
  if (value !== existingValue.value) {
    const duplicateValue = await prisma.attributeValue.findUnique({
      where: {
        attributeId_value: {
          attributeId: existingValue.attributeId,
          value,
        },
      },
    });

    if (duplicateValue) {
      throw new ApiError(400, "This value already exists for this attribute");
    }
  }

  // Handle image upload if provided
  let imageUrl = existingValue.image;
  if (req.file) {
    try {
      // Delete old image if exists
      if (existingValue.image) {
        await deleteFromS3(existingValue.image);
      }
      imageUrl = await processAndUploadImage(req.file, "attribute-values");
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new ApiError(500, "Failed to upload image");
    }
  }

  const updatedValue = await prisma.attributeValue.update({
    where: { id },
    data: {
      value,
      hexCode: hexCode !== undefined ? (hexCode || null) : existingValue.hexCode,
      image: imageUrl,
    },
    include: {
      attribute: true,
    },
  });

  // Format response with image URL
  const formattedValue = {
    ...updatedValue,
    image: updatedValue.image ? getFileUrl(updatedValue.image) : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { value: formattedValue },
        "Attribute value updated successfully"
      )
    );
});

// Delete attribute value
export const deleteAttributeValue = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Check if attribute value exists
  const value = await prisma.attributeValue.findUnique({
    where: { id },
    include: {
      variants: true,
    },
  });

  if (!value) {
    throw new ApiError(404, "Attribute value not found");
  }

  // Check if value is being used by any variants
  if (value.variants.length > 0) {
    throw new ApiError(
      400,
      "Cannot delete attribute value. It is being used by product variants."
    );
  }

  // Delete attribute value
  await prisma.attributeValue.delete({
    where: { id },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, null, "Attribute value deleted successfully"));
});
