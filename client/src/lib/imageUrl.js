// Centralized Image URL utility
// All URLs come from environment variable NEXT_PUBLIC_STORAGE_URL

/**
 * Get the full URL for an image stored in cloud storage
 * @param {string} image - The image path or URL
 * @returns {string} The full image URL
 */
export const getImageUrl = (image) => {
    // Handle object wrapper (e.g. from order details)
    const img = image?.url || image;

    if (!img) return "/tape.svg";
    if (typeof img !== 'string') return "/tape.svg";

    // If already a full URL, return as is
    if (img.startsWith("http")) return img;

    // If starts with /, it's a local file
    if (img.startsWith("/")) return img;

    // Get storage URL from environment variable
    const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL || "";

    if (!storageUrl) {
        console.warn("NEXT_PUBLIC_STORAGE_URL is not set. Images may not load correctly.");
        return `/${img}`;
    }

    // Otherwise, prepend the storage URL
    return `${storageUrl}/${img}`;
};

/**
 * Get product image URL
 * @param {object} product - Product object with images array
 * @returns {string} The product image URL
 */
export const getProductImageUrl = (product) => {
    const img = product?.images?.[0]?.url || product?.image;
    return getImageUrl(img);
};

/**
 * Get category image URL with tape.svg fallback
 * @param {string} image - Category image path
 * @returns {string} The category image URL
 */
export const getCategoryImageUrl = (image) => {
    const img = image?.url || image;
    if (!img || typeof img !== 'string') return "/tape.svg";
    return getImageUrl(img);
};

export default getImageUrl;
