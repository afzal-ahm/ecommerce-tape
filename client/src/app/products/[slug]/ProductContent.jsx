"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Star, Minus, Plus, AlertCircle, ShoppingCart, Heart, ChevronRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
// import ReviewSection from "./ReviewSection";
import { useAddVariantToCart } from "@/lib/cart-utils";
import { ProductCard } from "@/components/cards/ProductCard";
import { getImageUrl } from "@/lib/imageUrl";
import { VariantSelector } from "@/components/product/VariantSelector";

export default function ProductContent({ slug }) {
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [effectivePriceInfo, setEffectivePriceInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [availableCombinations, setAvailableCombinations] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [priceVisibilitySettings, setPriceVisibilitySettings] = useState(null);

  const { addVariantToCart } = useAddVariantToCart();

  // Calculate effective price based on quantity and pricing slabs
  const getEffectivePrice = (variant, qty) => {
    if (!variant) return null;

    const baseSalePrice = variant.salePrice ? (typeof variant.salePrice === 'string' ? parseFloat(variant.salePrice) : variant.salePrice) : null;
    const basePrice = variant.price ? (typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price) : 0;
    const price = baseSalePrice || basePrice;
    const originalPrice = basePrice;

    if (variant.pricingSlabs && variant.pricingSlabs.length > 0) {
      const sortedSlabs = [...variant.pricingSlabs].sort((a, b) => b.minQty - a.minQty);

      for (const slab of sortedSlabs) {
        if (qty >= slab.minQty && (slab.maxQty === null || qty <= slab.maxQty)) {
          return { price: slab.price, originalPrice: originalPrice, source: 'SLAB', slab: slab };
        }
      }
    }

    return { price: price, originalPrice: originalPrice, source: 'DEFAULT', slab: null };
  };

  // Fetch product details
  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      setInitialLoading(true);
      try {
        const response = await fetchApi(`/public/products/${slug}`);
        const productData = response.data.product;


        setProduct(productData);
        setRelatedProducts(response.data.relatedProducts || []);

        if (productData.images && productData.images.length > 0) {
          setMainImage(productData.images[0]);
        }

        if (productData.variants && productData.variants.length > 0) {
          const combinations = productData.variants
            .filter((v) => v.isActive)
            .map((variant) => ({
              attributeValueIds: variant.attributes ? variant.attributes.map((a) => a.attributeValueId) : [],
              variant: variant,
            }));

          setAvailableCombinations(combinations);

          // Only auto-select variant if product doesn't have its own price set
          // If product has price, show product price first, let user select variant manually
          const hasProductPrice = productData.price && parseFloat(productData.price) > 0;

          if (!hasProductPrice && productData.variants.length > 0) {
            // Default to the first active variant only if no product-level price
            const firstVariant = productData.variants[0];
            setSelectedVariant(firstVariant);

            // Set initial selected attributes based on this variant
            const initialAttributes = {};
            if (firstVariant.attributes) {
              firstVariant.attributes.forEach(attr => {
                initialAttributes[attr.attributeId] = attr.attributeValueId;
              });
            }
            setSelectedAttributes(initialAttributes);

            const moq = firstVariant.moq || 1;
            setQuantity(moq);
            const priceInfo = getEffectivePrice(firstVariant, moq);
            setEffectivePriceInfo(priceInfo);
          }
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    if (slug) {
      fetchProductDetails();
    }
  }, [slug]);

  // Fetch price visibility settings
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

  // Handle attribute value change
  const handleAttributeChange = (attributeId, attributeValueId) => {
    // 1. Try to maintain current selections + new selection
    const newSelections = { ...selectedAttributes, [attributeId]: attributeValueId };

    // Check if this exact combination exists
    const exactMatch = availableCombinations.find((combo) => {
      const comboIds = combo.attributeValueIds;
      const selectedIds = Object.values(newSelections);
      return selectedIds.every(id => comboIds.includes(id)) && comboIds.every(id => selectedIds.includes(id));
    });

    if (exactMatch) {
      // Perfect match found
      setSelectedAttributes(newSelections);
      setSelectedVariant(exactMatch.variant);
      updatePriceAndQuantity(exactMatch.variant);
      return;
    }

    // 2. Pivot Logic: If no exact match, find ANY variant that has this specific attribute value
    // This handles switching between disjoint variants (e.g., Length -> Print Type)
    const pivotVariant = availableCombinations.find((combo) =>
      combo.attributeValueIds.includes(attributeValueId)
    );

    if (pivotVariant) {
      // Switch to this new variant entirely
      const newAttributes = {};
      if (pivotVariant.variant.attributes) {
        pivotVariant.variant.attributes.forEach(attr => {
          newAttributes[attr.attributeId] = attr.attributeValueId;
        });
      }
      setSelectedAttributes(newAttributes);
      setSelectedVariant(pivotVariant.variant);
      updatePriceAndQuantity(pivotVariant.variant);
    } else {
      // Should not happen if UI is correct, but safe fallback
      setSelectedAttributes(newSelections);
      setSelectedVariant(null);
      setEffectivePriceInfo(null);
    }
  };

  const updatePriceAndQuantity = (variant) => {
    const moq = variant.moq || 1;
    // Reset quantity to MOQ when switching variants to prevent invalid quantities
    setQuantity(moq);
    const priceInfo = getEffectivePrice(variant, moq);
    setEffectivePriceInfo(priceInfo);
  };

  // Get available values for an attribute
  const getAvailableValuesForAttribute = (attributeId) => {
    if (!product?.attributeOptions) return [];

    const attribute = product.attributeOptions.find((attr) => attr.id === attributeId);
    if (!attribute || !attribute.values) return [];

    // Simply allow ANY value that exists in available combinations
    // This allows users to see all options and "pivot" to them
    return attribute.values.filter((val) =>
      availableCombinations.some(combo => combo.attributeValueIds.includes(val.id))
    );
  };

  // Check wishlist status
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated || !product) return;

      try {
        const response = await fetchApi("/users/wishlist", { credentials: "include" });
        const wishlistItems = response.data.wishlistItems || [];
        const inWishlist = wishlistItems.some((item) => item.productId === product.id);
        setIsInWishlist(inWishlist);
      } catch (error) {
        console.error("Failed to check wishlist status:", error);
      }
    };

    checkWishlistStatus();
  }, [isAuthenticated, product]);

  // Handle quantity change
  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    const effectiveMOQ = selectedVariant?.moq || 1;

    if (newQuantity < effectiveMOQ) return;

    const availableStock = selectedVariant?.stock || selectedVariant?.quantity || 0;
    if (availableStock > 0 && newQuantity > availableStock) return;

    setQuantity(newQuantity);

    if (selectedVariant) {
      const priceInfo = getEffectivePrice(selectedVariant, newQuantity);
      setEffectivePriceInfo(priceInfo);
    }
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!selectedVariant) {
      if (product?.variants && product.variants.length > 0) {
        setIsAddingToCart(true);
        setCartSuccess(false);

        try {
          const result = await addVariantToCart(product.variants[0], quantity, product.name);
          if (result.success) {
            setCartSuccess(true);
            setTimeout(() => { setCartSuccess(false); }, 3000);
          }
        } catch (err) {
          console.error("Error adding to cart:", err);
        } finally {
          setIsAddingToCart(false);
        }
      }
      return;
    }

    setIsAddingToCart(true);
    setCartSuccess(false);

    try {
      const result = await addVariantToCart(selectedVariant, quantity, product.name);
      if (result.success) {
        setCartSuccess(true);
        setTimeout(() => { setCartSuccess(false); }, 3000);
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle buy now
  const handleBuyNow = async () => {
    const variantToUse = selectedVariant || (product?.variants && product.variants.length > 0 ? product.variants[0] : null);

    if (!variantToUse) return;

    setIsAddingToCart(true);

    try {
      const result = await addVariantToCart(variantToUse, quantity, product.name);
      if (result.success) {
        router.push("/checkout");
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
    } finally {
      setIsAddingToCart(false);
    }
  };



  // Render product images
  const renderImages = () => {
    let imagesToShow = [];

    if (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0) {
      imagesToShow = selectedVariant.images;
    } else if (product && product.images && product.images.length > 0) {
      imagesToShow = product.images;
    } else if (product && product.variants && product.variants.length > 0) {
      const variantWithImages = product.variants.find((variant) => variant.images && variant.images.length > 0);
      if (variantWithImages) {
        imagesToShow = variantWithImages.images;
      }
    }

    if (imagesToShow.length === 0) {
      return (
        <div className="relative aspect-square w-full bg-white rounded-lg overflow-hidden border border-gray-200">
          <Image src="/images/product-placeholder.jpg" alt={product?.name || "Product"} fill className="object-contain p-2" priority />
        </div>
      );
    }

    if (imagesToShow.length === 1) {
      return (
        <div className="relative aspect-square w-full bg-white rounded-lg overflow-hidden border border-gray-200">
          <Image src={getImageUrl(imagesToShow[0].url)} alt={product?.name || "Product"} fill className="object-contain p-2" priority />
        </div>
      );
    }

    const primaryImage = imagesToShow.find((img) => img.isPrimary) || imagesToShow[0];
    const currentMainImage = mainImage && imagesToShow.some((img) => img.url === mainImage.url) ? mainImage : primaryImage;

    return (
      <div className="space-y-4">
        <div className="relative aspect-square w-full bg-white rounded-lg overflow-hidden border border-gray-200">
          <Image src={getImageUrl(currentMainImage?.url)} alt={product?.name || "Product"} fill className="object-contain p-2" priority />
        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {imagesToShow.map((image, index) => (
            <div key={index} className={`relative aspect-square w-full bg-white rounded-lg overflow-hidden cursor-pointer border-2 ${currentMainImage?.url === image.url ? "border-primary" : "border-gray-200"}`} onClick={() => setMainImage(image)}>
              <Image src={getImageUrl(image.url)} alt={`${product.name} - Image ${index + 1}`} fill className="object-contain p-1" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Calculate discount percentage
  const calculateDiscount = (regularPrice, salePrice) => {
    if (!regularPrice || !salePrice || regularPrice <= salePrice) return 0;
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  };

  // Format price display
  const getPriceDisplay = () => {
    if (initialLoading) {
      return <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>;
    }

    if (priceVisibilitySettings === null) {
      return (
        <div className="space-y-2">
          <span className="text-3xl md:text-4xl font-bold text-gray-400">Login to view price</span>
          <p className="text-sm text-gray-500">Please log in to see pricing information</p>
        </div>
      );
    }

    if (selectedVariant) {
      const priceInfo = effectivePriceInfo || getEffectivePrice(selectedVariant, quantity);

      if (!priceInfo) {
        return (
          <div className="space-y-2">
            <span className="text-3xl md:text-4xl font-bold text-gray-400">Price not available</span>
          </div>
        );
      }

      const effectivePrice = priceInfo.price;
      const originalPrice = priceInfo.originalPrice;
      const isSlabPrice = priceInfo.source === 'SLAB';
      const discount = originalPrice > effectivePrice ? calculateDiscount(originalPrice, effectivePrice) : 0;

      if (priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated) {
        return (
          <div className="space-y-2">
            <span className="text-3xl md:text-4xl font-bold text-gray-400">Login to view price</span>
            <p className="text-sm text-gray-500">Please log in to see pricing information</p>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl md:text-4xl font-bold text-primary">{formatCurrency(effectivePrice)}</span>
            {originalPrice > effectivePrice && (
              <>
                <span className="text-xl md:text-2xl text-gray-500 line-through">{formatCurrency(originalPrice)}</span>
                {discount > 0 && <span className="bg-red-500 text-white text-xs md:text-sm font-bold px-2 md:px-3 py-1 rounded">{discount}% OFF</span>}
              </>
            )}
          </div>
          {isSlabPrice && <p className="text-xs text-green-600 font-medium">Bulk pricing applied for {quantity} units</p>}
          <p className="text-xs text-gray-500">Inclusive of all taxes</p>
        </div>
      );
    }

    if (product) {
      const basePrice = product.basePrice || 0;
      const regularPrice = product.regularPrice || 0;

      if (product.hasSale && basePrice > 0 && regularPrice > basePrice) {
        const discount = calculateDiscount(regularPrice, basePrice);

        if (priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated) {
          return (
            <div className="space-y-2">
              <span className="text-3xl md:text-4xl font-bold text-gray-400">Login to view price</span>
              <p className="text-sm text-gray-500">Please log in to see pricing information</p>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl md:text-4xl font-bold text-primary">{formatCurrency(basePrice)}</span>
              <span className="text-xl md:text-2xl text-gray-500 line-through">{formatCurrency(regularPrice)}</span>
              {discount > 0 && <span className="bg-red-500 text-white text-xs md:text-sm font-bold px-2 md:px-3 py-1 rounded">{discount}% OFF</span>}
            </div>
            <p className="text-xs text-gray-500">Inclusive of all taxes</p>
          </div>
        );
      }

      if (basePrice > 0) {
        if (priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated) {
          return (
            <div className="space-y-2">
              <span className="text-3xl md:text-4xl font-bold text-gray-400">Login to view price</span>
              <p className="text-sm text-gray-500">Please log in to see pricing information</p>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <span className="text-3xl md:text-4xl font-bold text-primary">{formatCurrency(basePrice)}</span>
            <p className="text-xs text-gray-500">Inclusive of all taxes</p>
          </div>
        );
      }
    }

    return (
      <div className="space-y-2">
        <span className="text-3xl md:text-4xl font-bold text-gray-400">Price not available</span>
      </div>
    );
  };

  // Handle add to wishlist
  const handleAddToWishlist = async () => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=/products/${slug}`);
      return;
    }

    setIsAddingToWishlist(true);

    try {
      if (isInWishlist) {
        const wishlistResponse = await fetchApi("/users/wishlist", { credentials: "include" });
        const wishlistItem = wishlistResponse.data.wishlistItems.find((item) => item.productId === product.id);

        if (wishlistItem) {
          await fetchApi(`/users/wishlist/${wishlistItem.id}`, { method: "DELETE", credentials: "include" });
          setIsInWishlist(false);
        }
      } else {
        await fetchApi("/users/wishlist", { method: "POST", credentials: "include", body: JSON.stringify({ productId: product.id }) });
        setIsInWishlist(true);
      }
    } catch (error) {
      console.error("Error updating wishlist:", error);
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  // Display loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-gray-600 text-lg">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 p-6 rounded-lg shadow-sm border border-red-200 flex flex-col items-center text-center">
          <AlertCircle className="text-red-500 h-12 w-12 mb-4" />
          <h2 className="text-2xl font-semibold text-red-700 mb-2">Error Loading Product</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <Link href="/products"><Button className="px-6"><ChevronRight className="mr-2 h-4 w-4" /> Browse Other Products</Button></Link>
        </div>
      </div>
    );
  }

  // If product not found
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 p-6 rounded-lg shadow-sm border border-yellow-200 flex flex-col items-center text-center">
          <AlertCircle className="text-yellow-500 h-12 w-12 mb-4" />
          <h2 className="text-2xl font-semibold text-yellow-700 mb-2">Product Not Found</h2>
          <p className="text-yellow-600 mb-6">The product you are looking for does not exist or has been removed.</p>
          <Link href="/products"><Button className="px-6"><ChevronRight className="mr-2 h-4 w-4" /> Browse Products</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center text-xs sm:text-sm mb-6 md:mb-8 flex-wrap">
        <Link href="/" className="text-gray-500 hover:text-primary transition-colors">HOME</Link>
        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 mx-1 sm:mx-2 text-gray-400" />
        <Link href="/products" className="text-gray-500 hover:text-primary transition-colors">PRODUCTS</Link>
        {(product?.category || product?.categories?.[0]?.category) && (
          <>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 mx-1 sm:mx-2 text-gray-400" />
            <Link href={`/category/${product.category?.slug || product.categories[0]?.category?.slug}`} className="text-gray-500 hover:text-primary transition-colors uppercase">
              {product.category?.name || product.categories[0]?.category?.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 mx-1 sm:mx-2 text-gray-400" />
        <span className="text-primary font-medium truncate max-w-[200px] sm:max-w-none">{product?.name}</span>
      </div>

      {/* Product Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Product Images */}
        <div className="w-full lg:col-span-5">
          {loading ? <div className="aspect-square w-full bg-gray-100 rounded-lg animate-pulse"></div> : error ? (
            <div className="aspect-square w-full bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center p-6"><AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-red-600">{error}</p></div>
            </div>
          ) : renderImages()}
        </div>

        {/* Right Column - Product Details */}
        <div className="flex flex-col space-y-6 lg:col-span-7">
          {product.brand && <Link href={`/brand/${product.brand.slug}`} className="text-orange-500 text-sm mb-1">{product.brand?.name ?? product.brand ?? product.brandName ?? ""}</Link>}

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3  tracking-wide">{product.name}</h1>

          {/* Rating */}
          {/* Rating Removed */}

          {/* Flash Sale Banner */}
          {product.flashSale?.isActive && (
            <div className="mb-4 p-4 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="font-bold text-lg">Flash Sale</p>
                    <p className="text-sm opacity-90">{product.flashSale.name}</p>
                  </div>
                </div>
                <div className="bg-white/20 px-4 py-2 rounded-full">
                  <span className="font-bold text-xl">{product.flashSale.discountPercentage}% OFF</span>
                </div>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="mb-6">
            {product.flashSale?.isActive ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl md:text-4xl font-bold text-orange-600">
                    {formatCurrency(product.flashSale.flashSalePrice)}
                  </span>
                  <span className="text-xl md:text-2xl text-gray-500 line-through">
                    {formatCurrency(product.basePrice)}
                  </span>
                  <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs md:text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    ⚡ {product.flashSale.discountPercentage}% OFF
                  </span>
                </div>
                <p className="text-xs text-gray-500">Inclusive of all taxes | Flash Sale Price</p>
              </div>
            ) : (
              getPriceDisplay()
            )}
          </div>

          <VariantSelector product={product} />

          {/* Short Description */}
          {product.shortDescription && (
            <div className="p-4 border border-gray-200 rounded-md mb-6 bg-white">
              <p className="text-gray-700">{product.shortDescription || product.description?.substring(0, 150)}{product.description?.length > 150 && !product.shortDescription && "..."}</p>
            </div>
          )}


          {/* Success Message */}
          {cartSuccess && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-md flex items-center border border-green-200">
              <CheckCircle className="h-4 w-4 mr-2" />
              Item successfully added to your cart!
            </div>
          )}

          {/* MOQ Display */}
          {selectedVariant && selectedVariant.moq && selectedVariant.moq > 1 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Minimum Order Quantity: {selectedVariant.moq} units</p>
                  <p className="text-xs text-blue-700 mt-1">You need to order at least {selectedVariant.moq} units of this product</p>
                </div>
              </div>
            </div>
          )}

          {/* Stock Status */}
          <div className="mb-4">
            {selectedVariant && (selectedVariant.stock > 0 || selectedVariant.quantity > 0) && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                In Stock ({selectedVariant.stock || selectedVariant.quantity} available)
              </div>
            )}
            {selectedVariant && (selectedVariant.stock === 0 || selectedVariant.quantity === 0) && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                Out of stock
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 uppercase">Quantity</h3>
            <div className="flex items-center">
              <button className="p-2 border rounded-l-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleQuantityChange(-1)} disabled={quantity <= (selectedVariant?.moq || 1) || isAddingToCart}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-6 py-2 border-t border-b min-w-[3rem] text-center font-medium">{quantity}</span>
              <button className="p-2 border rounded-r-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleQuantityChange(1)} disabled={(selectedVariant && (selectedVariant.stock > 0 || selectedVariant.quantity > 0) && quantity >= (selectedVariant.stock || selectedVariant.quantity)) || isAddingToCart}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Button className="flex-1 flex items-center justify-center gap-2 py-4 md:py-6 text-base bg-primary hover:bg-primary/90 text-white rounded-md font-semibold uppercase tracking-wide" size="lg" onClick={handleAddToCart} disabled={isAddingToCart || (selectedVariant && selectedVariant.quantity < 1) || (!selectedVariant && (!product?.variants || product.variants.length === 0 || product.variants[0].quantity < 1))}>
              {isAddingToCart ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Adding...</>) : (<><ShoppingCart className="h-5 w-5" />ADD TO BAG</>)}
            </Button>

            <Button variant="outline" className={`rounded-md py-6 ${isInWishlist ? "text-red-600 border-red-600 hover:bg-red-50" : "border-gray-300 hover:border-primary hover:text-primary"}`} size="icon" onClick={handleAddToWishlist} disabled={isAddingToWishlist}>
              <Heart className={`h-5 w-5 ${isInWishlist ? "fill-current" : ""}`} />
            </Button>
          </div>

          {/* Product Metadata */}
          <div className="border-t border-gray-200 pt-5 space-y-3 text-sm">


            {product.category && (
              <div className="flex">
                <span className="font-medium w-32 text-gray-700">Category:</span>
                <Link href={`/category/${product.category?.slug}`} className="text-primary hover:underline">{product.category?.name}</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Tabs */}
      <div className="mb-16">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <button className={`px-6 py-3 font-medium text-sm uppercase transition-colors ${activeTab === "description" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("description")}>Description</button>
            <button className={`px-6 py-3 font-medium text-sm uppercase transition-colors ${activeTab === "shipping" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("shipping")}>Shipping</button>
          </div>
        </div>

        <div className="py-8">
          {activeTab === "description" && (
            <div className="prose max-w-none">
              <div className="mb-8">
                <div className="text-gray-700 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: product.description || "" }} />
              </div>

              {product.directions && (
                <div className="mt-8 p-6 bg-gray-50 rounded-md border border-gray-200">
                  <h3 className="text-xl font-bold mb-4 text-primary">Directions for Use</h3>
                  <p className="text-gray-700 leading-relaxed">{product.directions}</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews tab content removed */}

          {activeTab === "shipping" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4">Shipping Information</h3>
                <ul className="space-y-4">
                  <li className="pb-4 border-b border-gray-100"><p className="font-medium mb-1">Delivery Time</p><p className="text-gray-600 text-sm">3-5 business days (standard shipping)</p></li>
                  <li className="pb-4 border-b border-gray-100"><p className="font-medium mb-1">Free Shipping</p><p className="text-gray-600 text-sm">Free shipping on all orders above ₹999</p></li>
                  <li className="pb-4 border-b border-gray-100"><p className="font-medium mb-1">Express Delivery</p><p className="text-gray-600 text-sm">1-2 business days (₹199 extra)</p></li>
                </ul>
              </div>


            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6 relative border-b pb-2">
            <span className="bg-primary h-1 w-12 absolute bottom-0 left-0"></span>
            RELATED PRODUCTS
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
