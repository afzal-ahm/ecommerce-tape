-- Add hexCode and image fields to AttributeValue table
-- Migration: Add hexCode and image support for attribute values

ALTER TABLE "AttributeValue" 
ADD COLUMN IF NOT EXISTS "hexCode" TEXT,
ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Add comments for clarity
COMMENT ON COLUMN "AttributeValue"."hexCode" IS 'Hex color code for color attributes (e.g., #FF0000)';
COMMENT ON COLUMN "AttributeValue"."image" IS 'Image URL for attribute value (e.g., color swatch, size chart)';








