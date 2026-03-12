"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Plus, Minus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/imageUrl";



export default function ProductQuickView({ product, open, onOpenChange }) {
  const { addToCart, loading } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  if (!product) return null;

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const activeVariant = selectedVariant || variants[0];

  const price = activeVariant?.salePrice || activeVariant?.price || product.salePrice || product.price || 0;
  const originalPrice = activeVariant?.price || product.price || 0;
  const hasDiscount = originalPrice > price;

  const handleAddToCart = async () => {
    try {
      const variantId = activeVariant?.id || product.id;
      await addToCart(variantId, quantity);
      toast.success(`${product.name} added to cart`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Failed to add to cart");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 hover:bg-white">
          <X className="h-4 w-4" />
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative h-80 md:h-full bg-gray-100">
            <Image
              src={getImageUrl(product.image || product.images?.[0])}
              alt={product.name}
              fill
              className="object-contain p-4"
            />
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{product.name}</h2>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4" fill={i < Math.round(product.avgRating || 0) ? "currentColor" : "none"} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">({product.reviewCount || 0} reviews)</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-bold text-primary">{formatCurrency(price)}</span>
                {hasDiscount && <span className="text-lg text-gray-400 line-through">{formatCurrency(originalPrice)}</span>}
              </div>

              {/* Short description */}
              {product.shortDescription && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{product.shortDescription}</p>
              )}

              {/* Variants */}
              {hasVariants && variants.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Variant</label>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${(selectedVariant?.id || variants[0].id) === variant.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center border rounded-md hover:bg-gray-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center border rounded-md hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button onClick={handleAddToCart} className="w-full" size="lg" disabled={loading}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              <Link href={`/products/${product.slug}`} className="block">
                <Button variant="outline" className="w-full" size="lg" onClick={() => onOpenChange(false)}>
                  View Full Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
