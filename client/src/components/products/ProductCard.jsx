"use client";

import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { fetchApi, formatCurrency } from "@/lib/utils";
import { getImageUrl } from "@/lib/imageUrl";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Helper function to calculate discount percentage
const calculateDiscountPercentage = (regularPrice, salePrice) => {
  if (!regularPrice || !salePrice || regularPrice <= salePrice) return 0;
  return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
};

export const ProductCard = ({ product }) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  // Logic from user request
  const [wishlistItems, setWishlistItems] = useState({});
  const [isAddingToWishlist, setIsAddingToWishlist] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [priceVisibilitySettings, setPriceVisibilitySettings] = useState(null);


  // 1. Fetch wishlist status
  useEffect(() => {
    const fetchWishlistStatus = async () => {
      if (!isAuthenticated || typeof window === "undefined") return;

      try {
        const response = await fetchApi("/users/wishlist", {
          credentials: "include",
        });
        const items =
          response.data?.wishlistItems?.reduce((acc, item) => {
            acc[item.productId] = true;
            return acc;
          }, {}) || {};
        setWishlistItems(items);
      } catch (error) {
        console.error("Error fetching wishlist:", error);
      }
    };

    fetchWishlistStatus();
  }, [isAuthenticated]);

  // 2. Fetch price visibility settings
  useEffect(() => {
    const fetchPriceVisibilitySettings = async () => {
      try {
        const response = await fetchApi("/public/price-visibility-settings");
        if (response.success) {
          setPriceVisibilitySettings(response.data);
        }
      } catch (error) {
        console.error("Error fetching price visibility settings:", error);
        setPriceVisibilitySettings({ hidePricesForGuests: false });
      }
    };

    fetchPriceVisibilitySettings();
  }, []);

  // 3. Handle Wishlist Toggle
  const handleAddToWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent navigation to product page

    if (!isAuthenticated) {
      router.push(`/auth?redirect=/products/${product.slug}`);
      return;
    }

    // Optimistic update
    setIsAddingToWishlist((prev) => ({ ...prev, [product.id]: true }));

    try {
      if (wishlistItems[product.id]) {
        // Remove from wishlist
        const wishlistResponse = await fetchApi("/users/wishlist", {
          credentials: "include",
        });

        const wishlistItem = wishlistResponse.data?.wishlistItems?.find(
          (item) => item.productId === product.id
        );

        if (wishlistItem) {
          await fetchApi(`/users/wishlist/${wishlistItem.id}`, {
            method: "DELETE",
            credentials: "include",
          });

          setWishlistItems((prev) => {
            const newState = { ...prev };
            delete newState[product.id];
            return newState;
          });

        }
      } else {
        // Add to wishlist
        await fetchApi("/users/wishlist", {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ productId: product.id }),
        });

        setWishlistItems((prev) => ({ ...prev, [product.id]: true }));

      }
    } catch (error) {
      console.error("Error updating wishlist:", error);
      toast.error("Failed to update wishlist");
    } finally {
      setIsAddingToWishlist((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  // 4. Image Handling Logic
  const getAllProductImages = useMemo(() => {
    const images = [];
    const imageUrls = new Set();

    // Priority 1: Variant images
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach((variant) => {
        if (variant.images && Array.isArray(variant.images)) {
          variant.images.forEach((img) => {
            const url = img?.url || img;
            if (url) {
              const imageUrl = getImageUrl(url);
              if (!imageUrls.has(imageUrl)) {
                imageUrls.add(imageUrl);
                images.push(imageUrl);
              }
            }
          });
        }
      });
    }

    // Priority 2: Product images array
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img) => {
        const url = img?.url || img;
        if (url) {
          const imageUrl = getImageUrl(url);
          if (!imageUrls.has(imageUrl)) {
            imageUrls.add(imageUrl);
            images.push(imageUrl);
          }
        }
      });
    }

    // Priority 3: Single image fallback
    if (images.length === 0 && product.image) {
      const imageUrl = getImageUrl(product.image);
      if (!imageUrls.has(imageUrl)) {
        imageUrls.add(imageUrl);
        images.push(imageUrl);
      }
    }

    // Final fallback
    if (images.length === 0) {
      images.push("/tape.svg");
    }

    return images;
  }, [product]);

  // Auto-rotate images on hover
  useEffect(() => {
    if (!isHovered || getAllProductImages.length <= 1) {
      setCurrentImageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % getAllProductImages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isHovered, getAllProductImages.length]);

  // 5. Price Calculation Logic
  const parsePrice = (value) => {
    if (value === null || value === undefined) return null;
    if (value === 0) return 0;
    const parsed = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(parsed) ? null : parsed;
  };

  const basePriceField = parsePrice(product.basePrice);
  const regularPriceField = parsePrice(product.regularPrice);
  const priceField = parsePrice(product.price);
  const salePriceField = parsePrice(product.salePrice);

  // Check for active flash sale
  const hasFlashSale = product.flashSale?.isActive === true;
  const flashSalePrice = hasFlashSale ? parsePrice(product.flashSale.flashSalePrice) : null;
  const flashSaleDiscountPercent = hasFlashSale ? product.flashSale.discountPercentage : 0;

  let hasSale = false;
  if (product.hasSale !== undefined && product.hasSale !== null) {
    hasSale = Boolean(product.hasSale);
  } else {
    // Auto-detect
    if (salePriceField !== null && salePriceField > 0) {
      if (regularPriceField && salePriceField < regularPriceField) hasSale = true;
      else if (priceField && salePriceField < priceField) hasSale = true;
      else if (basePriceField && regularPriceField && salePriceField < regularPriceField) hasSale = true;
    }
  }

  let originalPrice = null;
  let currentPrice = 0;

  if (basePriceField !== null && regularPriceField !== null) {
    if (hasSale && basePriceField < regularPriceField) {
      currentPrice = basePriceField;
      originalPrice = regularPriceField;
    } else {
      currentPrice = basePriceField;
    }
  } else if (salePriceField !== null && (priceField !== null || basePriceField !== null)) {
    if (hasSale && salePriceField) {
      currentPrice = salePriceField;
      if (priceField && priceField > salePriceField) originalPrice = priceField;
      else if (basePriceField && basePriceField > salePriceField) originalPrice = basePriceField;
      else if (regularPriceField && regularPriceField > salePriceField) originalPrice = regularPriceField;
    } else {
      currentPrice = priceField || basePriceField || regularPriceField || 0;
    }
  } else {
    if (hasSale && salePriceField) {
      currentPrice = salePriceField;
      originalPrice = regularPriceField || priceField || basePriceField || null;
    } else {
      currentPrice = basePriceField || regularPriceField || priceField || salePriceField || 0;
    }
  }

  if (currentPrice === null || currentPrice === undefined || isNaN(currentPrice)) {
    currentPrice = 0;
  }

  // If flash sale is active, use flash sale price and set original price
  let displayPrice = currentPrice;
  let showFlashSaleBadge = false;

  if (hasFlashSale && flashSalePrice !== null) {
    // Store original price before flash sale
    if (!originalPrice) {
      originalPrice = currentPrice;
    }
    displayPrice = flashSalePrice;
    showFlashSaleBadge = true;
  }

  const discountPercent = showFlashSaleBadge
    ? flashSaleDiscountPercent
    : (hasSale && originalPrice && currentPrice
      ? calculateDiscountPercentage(originalPrice, currentPrice)
      : 0);



  // Price Visibility Check
  const showPrice = !priceVisibilitySettings?.hidePricesForGuests || isAuthenticated;

  return (
    <div
      className="group bg-white border border-gray-100 h-full flex flex-col transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Area */}
      <Link href={`/products/${product.slug}`} className="block relative aspect-[4/5] overflow-hidden bg-white p-6">
        {/* Wishlist Button */}
        <button
          onClick={handleAddToWishlist}
          disabled={isAddingToWishlist[product.id]}
          className="absolute top-3 right-3 z-20 p-2 text-gray-300 hover:text-red-500 transition-colors"
        >
          {isAddingToWishlist[product.id] ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart
              className={`h-4 w-4 ${wishlistItems[product.id] ? "fill-red-500 text-red-500" : ""}`}
            />
          )}
        </button>

        {/* Sale Badge */}
        {(hasSale || showFlashSaleBadge) && (
          <div className="absolute top-0 left-0 p-3 z-10">
            <span className="bg-[#FF4136] text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-tighter shadow-sm">
              {showFlashSaleBadge ? "FLASH" : "SALE"}
            </span>
          </div>
        )}

        {/* Main Image */}
        <div className="relative w-full h-full">
          <Image
            src={getAllProductImages[currentImageIndex] || "/tape.svg"}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, 20vw"
          />
        </div>

        {/* Hover label */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
          View Details
        </div>
      </Link>

      {/* Product Details */}
      <div className="p-4 flex flex-col flex-1 text-center bg-white border-t border-gray-50">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-display text-[14px] font-bold text-black uppercase tracking-tight mb-2 line-clamp-2 min-h-[2.5em] group-hover:text-[#F7941D] transition-colors leading-tight">
            {product.name}
          </h3>
        </Link>

        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">
          {typeof product.category === 'object' ? product.category.name : (product.category || "Premium Choice")}
        </p>

        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex flex-col items-start text-left">
            {showPrice ? (
              <>
                <span className="text-black font-black text-lg font-sans">
                  {formatCurrency(displayPrice)}
                </span>
                {(hasSale || showFlashSaleBadge) && originalPrice && (
                  <span className="text-gray-300 text-xs line-through leading-none font-sans">
                    {formatCurrency(originalPrice)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[10px] font-bold text-[#F7941D] uppercase tracking-widest">Login for Price</span>
            )}
          </div>

          <Link
            href={`/products/${product.slug}`}
            className="bg-[#F7941D] hover:bg-black text-white px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-colors"
          >
            ADD
          </Link>
        </div>
      </div>
    </div>
  );
};
