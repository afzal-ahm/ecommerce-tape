/**
 * Utility function to format image URLs correctly
 * Uses environment variable VITE_STORAGE_URL for storage URL
 * @param image The image path or URL
 * @returns Properly formatted image URL
 */
export const getImageUrl = (image: string | null | undefined): string => {
  if (!image) return "https://placehold.co/600x400?text=No+Image";
  if (image.startsWith("http")) return image;

  const storageUrl = import.meta.env.VITE_STORAGE_URL;
  if (!storageUrl) {
    console.warn("VITE_STORAGE_URL is not set. Images may not load correctly.");
    return `/${image}`;
  }

  return `${storageUrl}/${image}`;
};
