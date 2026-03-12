"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, Heart } from "lucide-react";
import { getProductImageUrl as getImageUrl } from "@/lib/imageUrl";
import { useAddVariantToCart } from "@/lib/cart-utils";
import { useWishlist } from "@/lib/wishlist-context";

export function ProductCard({ product }) {
    const { addVariantToCart } = useAddVariantToCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const isWishlisted = isInWishlist(product.id);

    const handleAddToCart = async (e) => {
        e.preventDefault();
        if (product.variants?.length > 0) {
            const variant = product.variants[0];
            await addVariantToCart(variant, 1, product.name);
        }
    };

    const handleWishlist = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleWishlist(product);
    };

    return (
        <div className="group bg-white border border-gray-100 h-full flex flex-col transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] relative">
            {/* Image Container - Maximized Size */}
            <div className="relative aspect-[4/5] bg-white overflow-hidden p-2">
                <Link href={`/products/${product.slug}`} className="block h-full w-full relative">
                    <Image
                        src={getImageUrl(product)}
                        alt={product.name}
                        fill
                        className="object-contain transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 20vw"
                    />
                </Link>

                {/* Wishlist Button */}
                <button
                    onClick={handleWishlist}
                    className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-red-500 transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                    title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                    <Heart className={`w-4 h-4 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
                </button>

                {/* Hover Action - Quick View */}
                <Link
                    href={`/products/${product.slug}`}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 shadow-lg whitespace-nowrap"
                >
                    View Details
                </Link>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1 text-center bg-white border-t border-gray-50">
                <Link href={`/products/${product.slug}`}>
                    <h3 className="font-sans text-[14px] font-semibold text-black hover:text-[#F7941D] transition-colors leading-tight mb-2 line-clamp-2 min-h-[2.5em]">
                        {product.name}
                    </h3>
                </Link>

                {/* Category Label */}
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">
                    {product.category?.name || "Premium Quality"}
                </p>

                {/* Price & Add Button */}
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex flex-col items-start text-left">
                        <span className="text-black font-bold text-lg">
                            ₹{(product.basePrice || product.price || 0)?.toLocaleString()}
                        </span>
                        {product.regularPrice > (product.basePrice || product.price || 0) && (
                            <span className="text-gray-300 text-xs line-through leading-none font-sans">
                                ₹{product.regularPrice?.toLocaleString()}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleAddToCart}
                        className="bg-[#F7941D] hover:bg-black text-white px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    >
                        ADD <Plus className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
