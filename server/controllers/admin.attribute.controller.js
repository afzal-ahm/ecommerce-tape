import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all attributes
export const getAllAttributes = asyncHandler(async (req, res, next) => {
  const { search } = req.query;

  const where = search
    ? {
        name: {
          contains: search,
          mode: "insensitive",
        },
      }
    : {};

  const attributes = await prisma.attribute.findMany({
    where,
    include: {
      values: {
        orderBy: {
          value: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, { attributes }, "Attributes fetched successfully")
    );
});

// Get attribute by ID
export const getAttributeById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const attribute = await prisma.attribute.findUnique({
    where: { id },
    include: {
      values: {
        orderBy: {
          value: "asc",
        },
      },
    },
  });

  if (!attribute) {
    throw new ApiError(404, "Attribute not found");
  }

  res
    .status(200)
    .json(
      new ApiResponsive(200, { attribute }, "Attribute fetched successfully")
    );
});

// Create attribute
export const createAttribute = asyncHandler(async (req, res, next) => {
  const { name, inputType } = req.body;

  // Validation
  if (!name || !inputType) {
    throw new ApiError(400, "Name and inputType are required");
  }

  const validInputTypes = ["text", "number", "select", "multiselect"];
  if (!validInputTypes.includes(inputType)) {
    throw new ApiError(
      400,
      `inputType must be one of: ${validInputTypes.join(", ")}`
    );
  }

  // Check if attribute with same name already exists
  const existingAttribute = await prisma.attribute.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existingAttribute) {
    throw new ApiError(400, "Attribute with this name already exists");
  }

  const attribute = await prisma.attribute.create({
    data: {
      name,
      inputType,
    },
    include: {
      values: true,
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(201, { attribute }, "Attribute created successfully")
    );
});

// Update attribute
export const updateAttribute = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, inputType } = req.body;

  // Check if attribute exists
  const existingAttribute = await prisma.attribute.findUnique({
    where: { id },
  });

  if (!existingAttribute) {
    throw new ApiError(404, "Attribute not found");
  }

  // Validation
  if (inputType) {
    const validInputTypes = ["text", "number", "select", "multiselect"];
    if (!validInputTypes.includes(inputType)) {
      throw new ApiError(
        400,
        `inputType must be one of: ${validInputTypes.join(", ")}`
      );
    }
  }

  // Check for duplicate name if name is being updated
  if (name && name !== existingAttribute.name) {
    const duplicateAttribute = await prisma.attribute.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        id: {
          not: id,
        },
      },
    });

    if (duplicateAttribute) {
      throw new ApiError(400, "Attribute with this name already exists");
    }
  }

  const attribute = await prisma.attribute.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(inputType && { inputType }),
    },
    include: {
      values: {
        orderBy: {
          value: "asc",
        },
      },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, { attribute }, "Attribute updated successfully")
    );
});

// Delete attribute
export const deleteAttribute = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Check if attribute exists
  const attribute = await prisma.attribute.findUnique({
    where: { id },
    include: {
      values: {
        include: {
          variants: true,
        },
      },
    },
  });

  if (!attribute) {
    throw new ApiError(404, "Attribute not found");
  }

  // Check if attribute is being used by any variants
  const variantsUsingAttribute = attribute.values.some(
    (value) => value.variants.length > 0
  );

  if (variantsUsingAttribute) {
    throw new ApiError(
      400,
      "Cannot delete attribute. It is being used by product variants."
    );
  }

  // Delete attribute (values will be cascade deleted)
  await prisma.attribute.delete({
    where: { id },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, null, "Attribute deleted successfully"));
});
