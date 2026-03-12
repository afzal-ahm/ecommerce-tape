/**
 * Utility to generate SKUs automatically based on product title, category, and price
 */

/**
 * Generates a base SKU from a product title by taking the first 3 letters
 * @param {string} title - Product title
 * @returns {string} - Base SKU prefix
 */
const getSkuPrefixFromTitle = (title) => {
  if (!title) return "PRD";

  // Remove special characters, convert to uppercase and take first 3 letters
  return title
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .substring(0, 3);
};

/**
 * Generates a category code from category name by taking the first 2 letters
 * @param {string} categoryName - Category name
 * @returns {string} - Category code
 */
const getCategoryCode = (categoryName) => {
  if (!categoryName) return "GN"; // GN for general if no category

  // Remove special characters, convert to uppercase and take first 2 letters
  return categoryName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Generate a unique SKU based on product details
 * @param {Object} product - Product object with title, category, and price
 * @param {string} variant - Optional variant info (flavor, weight)
 * @param {number} index - Optional index for generating multiple variants
 * @returns {string} - Generated SKU
 */
export const generateSKU = (product, variant = "", index = 0) => {
  if (!product) return "SKU" + Date.now().toString().substring(9, 13);

  const titlePrefix = getSkuPrefixFromTitle(product.name);
  const categoryCode = getCategoryCode(product.categoryName);

  // Use price to generate a unique number (remove decimal and take last 3 digits)
  const price = product.regularPrice || product.basePrice || 0;
  const priceCode = Math.floor(price * 100)
    .toString()
    .slice(-3)
    .padStart(3, "0");

  // Create base SKU
  let sku = `${titlePrefix}-${categoryCode}-${priceCode}`;

  // Add variant code if it exists
  if (variant) {
    const variantCode = variant
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .substring(0, 2);
    sku += `-${variantCode}`;
  }

  // Add index if provided (for multiple variants)
  if (index > 0) {
    sku += index.toString().padStart(2, "0");
  }

  // Add a random suffix to ensure uniqueness
  const randomSuffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return sku + randomSuffix;
};

/**
 * Generate SKUs for product variants based on flavor and weight combinations
 * @param {Object} product - Product object with details
 * @param {Array} flavors - Array of flavor objects
 * @param {Array} weights - Array of weight objects
 * @returns {Array} - Array of variant objects with generated SKUs
 */
export const generateVariantSKUs = (product, flavors = [], weights = []) => {
  const variants = [];

  // If no flavors or weights, generate a single SKU
  if (
    (!flavors || flavors.length === 0) &&
    (!weights || weights.length === 0)
  ) {
    return [
      {
        sku: generateSKU(product),
        price: product.regularPrice || product.basePrice,
        salePrice: product.hasSale ? product.salePrice : null,
        quantity: product.stock || 0,
      },
    ];
  }

  let index = 0;

  // Generate combinations of flavors and weights
  if (flavors.length > 0 && weights.length > 0) {
    flavors.forEach((flavor) => {
      weights.forEach((weight) => {
        index++;
        const variantName = `${flavor.name}-${weight.value}${weight.unit}`;
        variants.push({
          sku: generateSKU(product, variantName, index),
          flavorId: flavor.id,
          weightId: weight.id,
          price: product.regularPrice || product.basePrice,
          salePrice: product.hasSale ? product.salePrice : null,
          quantity: product.stock || 0,
        });
      });
    });
  }
  // Only flavors, no weights
  else if (flavors.length > 0) {
    flavors.forEach((flavor) => {
      index++;
      variants.push({
        sku: generateSKU(product, flavor.name, index),
        flavorId: flavor.id,
        weightId: null,
        price: product.regularPrice || product.basePrice,
        salePrice: product.hasSale ? product.salePrice : null,
        quantity: product.stock || 0,
      });
    });
  }
  // Only weights, no flavors
  else if (weights.length > 0) {
    weights.forEach((weight) => {
      index++;
      const weightStr = `${weight.value}${weight.unit}`;
      variants.push({
        sku: generateSKU(product, weightStr, index),
        flavorId: null,
        weightId: weight.id,
        price: product.regularPrice || product.basePrice,
        salePrice: product.hasSale ? product.salePrice : null,
        quantity: product.stock || 0,
      });
    });
  }

  return variants;
};

export default { generateSKU, generateVariantSKUs };
