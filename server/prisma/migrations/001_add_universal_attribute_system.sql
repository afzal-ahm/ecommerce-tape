-- Migration: Add Universal Attribute System
-- This migration creates the new Attribute, AttributeValue, and VariantAttributeValue tables
-- Note: This assumes the old Size and Color tables will be removed separately

-- Create Attribute table
CREATE TABLE IF NOT EXISTS "Attribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- Create AttributeValue table
CREATE TABLE IF NOT EXISTS "AttributeValue" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "AttributeValue_pkey" PRIMARY KEY ("id")
);

-- Create VariantAttributeValue table (junction table)
CREATE TABLE IF NOT EXISTS "VariantAttributeValue" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "attributeValueId" TEXT NOT NULL,
    CONSTRAINT "VariantAttributeValue_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VariantAttributeValue" ADD CONSTRAINT "VariantAttributeValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VariantAttributeValue" ADD CONSTRAINT "VariantAttributeValue_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "AttributeValue_attributeId_value_key" ON "AttributeValue"("attributeId", "value");
CREATE UNIQUE INDEX IF NOT EXISTS "VariantAttributeValue_variantId_attributeValueId_key" ON "VariantAttributeValue"("variantId", "attributeValueId");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "AttributeValue_attributeId_idx" ON "AttributeValue"("attributeId");
CREATE INDEX IF NOT EXISTS "VariantAttributeValue_variantId_idx" ON "VariantAttributeValue"("variantId");
CREATE INDEX IF NOT EXISTS "VariantAttributeValue_attributeValueId_idx" ON "VariantAttributeValue"("attributeValueId");








