-- Migration to add order field to ProductImage and ProductVariantImage tables
-- and update existing records with proper order values

BEGIN;

-- Add order column to ProductImage table
ALTER TABLE "ProductImage" ADD COLUMN "order" INTEGER DEFAULT 0;

-- Add order column to ProductVariantImage table  
ALTER TABLE "ProductVariantImage" ADD COLUMN "order" INTEGER DEFAULT 0;

-- Update ProductImage records with proper order values
-- Set primary images to order 0, others to their creation order
WITH ordered_images AS (
  SELECT 
    id,
    "productId",
    "isPrimary",
    "createdAt",
    ROW_NUMBER() OVER (
      PARTITION BY "productId" 
      ORDER BY 
        CASE WHEN "isPrimary" = true THEN 0 ELSE 1 END,
        "createdAt" ASC
    ) - 1 as new_order
  FROM "ProductImage"
)
UPDATE "ProductImage" 
SET "order" = ordered_images.new_order
FROM ordered_images
WHERE "ProductImage".id = ordered_images.id;

-- Update ProductVariantImage records with proper order values
-- Set primary images to order 0, others to their creation order
WITH ordered_variant_images AS (
  SELECT 
    id,
    "variantId",
    "isPrimary",
    "createdAt",
    ROW_NUMBER() OVER (
      PARTITION BY "variantId" 
      ORDER BY 
        CASE WHEN "isPrimary" = true THEN 0 ELSE 1 END,
        "createdAt" ASC
    ) - 1 as new_order
  FROM "ProductVariantImage"
)
UPDATE "ProductVariantImage" 
SET "order" = ordered_variant_images.new_order
FROM ordered_variant_images
WHERE "ProductVariantImage".id = ordered_variant_images.id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "ProductImage_productId_order_idx" ON "ProductImage"("productId", "order");
CREATE INDEX IF NOT EXISTS "ProductVariantImage_variantId_order_idx" ON "ProductVariantImage"("variantId", "order");

COMMIT; 