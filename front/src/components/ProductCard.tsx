import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Heart, ShoppingCart, Star, Loader2 } from "lucide-react";
import { cart, wishlist } from "@/api/userService";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/api";

interface ProductProps {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: { url: string; alt?: string; isPrimary: boolean }[];
  variants: ProductVariant[];
  averageRating?: number;
  reviewCount?: number;
  isInWishlist?: boolean;
}

interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  salePrice?: number | null;
  flavorId?: string | null;
  weightId?: string | null;
  flavor?: { id: string; name: string } | null;
  weight?: { id: string; value: number; unit: string } | null;
  quantity: number;
  images?: Array<{
    id: string;
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
}

// Add helper functions to determine if it's a simple product and to get a display name for variants
const isSimpleProduct = (variants: ProductVariant[]) => {
  return (
    variants.length === 1 && !variants[0].flavorId && !variants[0].weightId
  );
};

const getVariantDisplayName = (variant: ProductVariant) => {
  if (!variant.flavor && !variant.weight) return "";

  const flavorName = variant.flavor?.name || "";
  const weightValue = variant.weight
    ? `${variant.weight.value}${variant.weight.unit}`
    : "";

  if (flavorName && weightValue) {
    return `${flavorName} - ${weightValue}`;
  } else if (flavorName) {
    return flavorName;
  } else if (weightValue) {
    return weightValue;
  }

  return "";
};

export function ProductCard({
  id,
  name,
  slug,
  description,
  images,
  variants,
  averageRating = 0,
  reviewCount = 0,
  isInWishlist = false,
}: ProductProps) {
  const [addingToCart, setAddingToCart] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [inWishlist, setInWishlist] = useState(isInWishlist);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [priceVisibilitySettings, setPriceVisibilitySettings] = useState<{
    hidePricesForGuests: boolean;
  } | null>(null);
  const { isAuthenticated } = useAuth();

  // Get display image considering variant images with improved fallback
  const getDisplayImage = () => {
    // Priority 1: Selected variant images
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      const primaryVariantImage = selectedVariant.images.find(
        (img) => img.isPrimary
      );
      return primaryVariantImage || selectedVariant.images[0];
    }

    // Priority 2: Product images
    const productImage = images.find((img) => img.isPrimary) || images[0];
    if (productImage) {
      return productImage;
    }

    // Priority 3: Any variant images from any variant
    if (variants && variants.length > 0) {
      const variantWithImages = variants.find(
        (variant) => variant.images && variant.images.length > 0
      );
      if (variantWithImages && variantWithImages.images) {
        const primaryVariantImage = variantWithImages.images.find(
          (img) => img.isPrimary
        );
        return primaryVariantImage || variantWithImages.images[0];
      }
    }

    // Final fallback
    return null;
  };

  const displayImage = getDisplayImage();

  // Set default variant on initial load
  useEffect(() => {
    if (variants.length > 0) {
      // Find the cheapest variant or use the first one
      const cheapestVariant = variants.reduce((prev, current) =>
        (current.salePrice || current.price) < (prev.salePrice || prev.price)
          ? current
          : prev
      );

      setSelectedVariant(cheapestVariant);
    }
  }, [variants]);

  // Fetch price visibility settings
  useEffect(() => {
    const fetchPriceVisibilitySettings = async () => {
      try {
        const response = await api.get("/public/price-visibility-settings");
        if (response?.data) {
          setPriceVisibilitySettings(response.data);
        }
      } catch (error) {
        console.error("Error fetching price visibility settings:", error);
      }
    };

    fetchPriceVisibilitySettings();
  }, []);

  // Render nothing until we have a selected variant
  if (!selectedVariant) {
    return null;
  }

  // Format the price display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Calculate discount percentage
  const getDiscountPercentage = (original: number, sale: number) => {
    return Math.round(((original - sale) / original) * 100);
  };

  // Handle adding to cart
  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);

      // Add item to cart using selected variant
      const response = await cart.addToCart(selectedVariant.id, 1);

      if (response.data.success) {
        toast.success("Added to cart successfully!");
      }
    } catch (error: any) {
      console.error("Error adding to cart:", error);

      // Handle unauthenticated error specifically
      if (error.response?.status === 401) {
        toast.error("Please log in to add items to your cart");
      } else {
        toast.error(error.response?.data?.message || "Failed to add to cart");
      }
    } finally {
      setAddingToCart(false);
    }
  };

  // Handle wishlist toggle
  const handleWishlistToggle = async () => {
    try {
      setTogglingWishlist(true);

      if (inWishlist) {
        // We need to get the wishlist item ID first
        const wishlistRes = await wishlist.getWishlist();
        const wishlistItem = wishlistRes.data.data.wishlistItems.find(
          (item: any) => item.productId === id
        );

        if (wishlistItem) {
          await wishlist.removeFromWishlist(wishlistItem.id);
          setInWishlist(false);
          toast.success("Removed from wishlist");
        }
      } else {
        await wishlist.addToWishlist(id);
        setInWishlist(true);
        toast.success("Added to wishlist");
      }
    } catch (error: any) {
      console.error("Error toggling wishlist:", error);

      if (error.response?.status === 401) {
        toast.error("Please log in to manage your wishlist");
      } else {
        toast.error(
          error.response?.data?.message || "Failed to update wishlist"
        );
      }
    } finally {
      setTogglingWishlist(false);
    }
  };

  // Truncate description for card display
  const truncateDescription = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Card className="overflow-hidden group h-full flex flex-col">
      <div className="relative overflow-hidden">
        <Link to={`/products/${slug}`}>
          <img
            src={displayImage?.url || "/placeholder-product.jpg"}
            alt={displayImage?.alt || name}
            className="h-48 w-full object-cover transition-transform group-hover:scale-105"
          />
        </Link>

        {selectedVariant.salePrice && (
          <Badge className="absolute top-2 right-2 bg-red-500 hover:bg-red-600">
            {getDiscountPercentage(
              selectedVariant.price,
              selectedVariant.salePrice
            )}
            % OFF
          </Badge>
        )}

        <Button
          size="icon"
          variant="ghost"
          className={`absolute top-2 left-2 bg-white/80 hover:bg-white ${inWishlist ? "text-red-500 hover:text-red-600" : ""
            }`}
          onClick={handleWishlistToggle}
          disabled={togglingWishlist}
        >
          {togglingWishlist ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
          )}
        </Button>
      </div>

      <CardContent className="p-4 flex-grow">
        <Link to={`/products/${slug}`} className="hover:underline">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">{name}</h3>
        </Link>

        {/* Display variant name if it's not a simple product */}
        {!isSimpleProduct(variants) && selectedVariant && (
          <div className="text-xs text-muted-foreground mb-1">
            {getVariantDisplayName(selectedVariant)}
          </div>
        )}

        <div className="flex items-center mb-2">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 mr-1" />
            <span className="text-sm">{averageRating.toFixed(1)}</span>
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {truncateDescription(description)}
        </p>

        <div className="mb-2">
          <div className="font-medium">
            {priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated ? (
              // Hide prices for non-authenticated users when setting is enabled
              <span className="text-base text-gray-400">
                Login to view price
              </span>
            ) : selectedVariant.salePrice ? (
              <div className="flex items-center gap-2">
                <span className="text-red-500">
                  {formatPrice(selectedVariant.salePrice)}
                </span>
                <span className="text-muted-foreground line-through text-sm">
                  {formatPrice(selectedVariant.price)}
                </span>
              </div>
            ) : (
              <span>{formatPrice(selectedVariant.price)}</span>
            )}
          </div>

          {variants.length > 1 && (
            <div className="text-xs text-muted-foreground mt-1">
              {variants.length} variants available
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          className="w-full"
          onClick={handleAddToCart}
          disabled={addingToCart || selectedVariant.quantity <= 0}
        >
          {addingToCart ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ShoppingCart className="h-4 w-4 mr-2" />
          )}
          {selectedVariant.quantity <= 0 ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
}
