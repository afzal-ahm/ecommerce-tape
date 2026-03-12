/**
 * Helper functions for formatting variants with attributes
 */

/**
 * Formats a variant with its attributes in the required format
 * @param {Object} variant - Prisma variant object with attributes relation
 * @returns {Object} - Formatted variant with attributes array
 */
export const formatVariantWithAttributes = (variant) => {
  if (!variant) return null;

  // Extract attributes from VariantAttributeValue relations
  const attributes = variant.attributes
    ? variant.attributes.map((vav) => ({
      attribute: vav.attributeValue?.attribute?.name || "Unknown",
      value: vav.attributeValue?.value || "Unknown",
      attributeId: vav.attributeValue?.attribute?.id || "",
      attributeValueId: vav.attributeValue?.id || "",
    }))
    : [];

  return {
    ...variant,
    attributes,
  };
};


/**
 * Extracts ALL attributes from variant dynamically (not hardcoded to Color/Size)
 * @param {Object} variant - Prisma variant object with attributes relation
 * @returns {Object} - Object with all attributes as key-value pairs
 * Example: { "Color": { name: "Red", hexCode: "#FF0000" }, "Size": { name: "L" } }
 */
export const extractAllAttributes = (variant) => {
  if (!variant || !variant.attributes) {
    return {};
  }

  const attributesMap = {};

  variant.attributes.forEach((vav) => {
    const attrName = vav.attributeValue?.attribute?.name;
    const attrValue = vav.attributeValue?.value;
    const hexCode = vav.attributeValue?.hexCode;
    const image = vav.attributeValue?.image;
    const attributeValueId = vav.attributeValue?.id;
    const attributeId = vav.attributeValue?.attribute?.id;

    if (attrName && attrValue) {
      attributesMap[attrName] = {
        name: attrValue,
        value: attrValue,
        id: attributeValueId,
        attributeId: attributeId,
        hexCode: hexCode || null,
        image: image || null,
      };
    }
  });

  return attributesMap;
};


/**
 * Extracts color and size from variant attributes (for backward compatibility)
 * @param {Object} variant - Prisma variant object with attributes relation
 * @returns {Object} - Object with color and size info
 * @deprecated Use extractAllAttributes instead for dynamic attribute handling
 */
export const extractColorAndSize = (variant) => {
  const allAttributes = extractAllAttributes(variant);
  return {
    color: allAttributes["Color"] || null,
    size: allAttributes["Size"] || null,
  };
};

/**
 * Formats multiple variants with attributes
 * @param {Array} variants - Array of Prisma variant objects
 * @returns {Array} - Array of formatted variants
 */
export const formatVariantsWithAttributes = (variants) => {
  if (!variants || !Array.isArray(variants)) return [];
  return variants.map(formatVariantWithAttributes);
};

/**
 * Generates SKU suffix from attribute values
 * @param {Array} attributeValueIds - Array of attribute value IDs
 * @param {Object} prisma - Prisma client instance
 * @returns {Promise<string>} - SKU suffix string
 */
export const generateSKUSuffixFromAttributes = async (
  attributeValueIds,
  prisma
) => {
  if (!attributeValueIds || attributeValueIds.length === 0) return "";

  const attributeValues = await prisma.attributeValue.findMany({
    where: {
      id: {
        in: attributeValueIds,
      },
    },
    include: {
      attribute: true,
    },
  });

  // Sort by attribute name for consistency
  attributeValues.sort((a, b) =>
    a.attribute.name.localeCompare(b.attribute.name)
  );

  // Generate suffix from first 2-3 chars of each value
  const suffix = attributeValues
    .map((av) => {
      const valueCode = av.value
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .substring(0, 3);
      return valueCode;
    })
    .join("-");

  return suffix ? `-${suffix}` : "";
};
