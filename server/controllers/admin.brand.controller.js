import slugify from "slugify";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";
import { prisma } from "../config/db.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { deleteFromS3 } from "../utils/deleteFromS3.js";

// Create Brand
export const createBrand = asyncHandler(async (req, res) => {
  const { name, tags } = req.body;
  if (!name) throw new ApiError(400, "Brand name is required");
  const slug = slugify(name, { lower: true });
  let image = null;
  if (req.file) {
    image = await processAndUploadImage(req.file, "brands");
  } else {
    throw new ApiError(400, "Brand image is required");
  }
  const brand = await prisma.brand.create({
    data: {
      name,
      slug,
      image,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
    },
  });
  res.status(201).json(new ApiResponsive(201, { brand }, "Brand created"));
});

// Update Brand
export const updateBrand = asyncHandler(async (req, res) => {
  const { brandId } = req.params;
  const { name, tags } = req.body;
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw new ApiError(404, "Brand not found");
  let updateData = {};
  if (name) {
    updateData.name = name;
    updateData.slug = slugify(name, { lower: true });
  }
  if (tags) {
    updateData.tags = Array.isArray(tags) ? tags : [tags];
  }
  if (req.file) {
    if (brand.image) await deleteFromS3(brand.image);
    updateData.image = await processAndUploadImage(req.file, "brands");
  }
  const updatedBrand = await prisma.brand.update({
    where: { id: brandId },
    data: updateData,
  });
  res
    .status(200)
    .json(new ApiResponsive(200, { brand: updatedBrand }, "Brand updated"));
});

// Delete Brand
export const deleteBrand = asyncHandler(async (req, res) => {
  const { brandId } = req.params;
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { products: true },
  });
  if (!brand) throw new ApiError(404, "Brand not found");

  // Unlink all products from this brand
  await prisma.product.updateMany({
    where: { brandId },
    data: { brandId: null },
  });

  // Delete brand image from S3 if exists
  if (brand.image) await deleteFromS3(brand.image);

  // Delete the brand
  await prisma.brand.delete({ where: { id: brandId } });
  res.status(200).json(new ApiResponsive(200, {}, "Brand deleted"));
});

// Get All Brands (with tag filter)
export const getAllBrands = asyncHandler(async (req, res) => {
  const { tag } = req.query;
  const where = tag ? { tags: { has: tag } } : {};
  const brands = await prisma.brand.findMany({
    where,
    include: { products: true },
  });
  res.status(200).json(new ApiResponsive(200, { brands }, "Brands fetched"));
});

// Get Brand By Id
export const getBrandById = asyncHandler(async (req, res) => {
  const { brandId } = req.params;
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { products: true },
  });
  if (!brand) throw new ApiError(404, "Brand not found");
  res.status(200).json(new ApiResponsive(200, { brand }, "Brand fetched"));
});

// Remove a product from a brand
export const removeProductFromBrand = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  await prisma.product.update({
    where: { id: productId },
    data: { brandId: null },
  });
  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Product removed from brand"));
});
