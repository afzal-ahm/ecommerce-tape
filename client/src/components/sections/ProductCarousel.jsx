"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingCart, Star, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { formatPrice, getCategoryName } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useState } from "react";

export const ProductCarousel = ({ products, title, subtitle, viewAllLink = "/products", badge }) => {
    const { addToCart, isInCart } = useCart();
    const [addedItems, setAddedItems] = useState({});

    const handleAddToCart = (e, product) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product.id, 1);
        setAddedItems(prev => ({ ...prev, [product.id]: true }));
        setTimeout(() => {
            setAddedItems(prev => ({ ...prev, [product.id]: false }));
        }, 1500);
    };

    return (
        <section className="section-padding bg-background">
            <div className="section-container">
                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        {badge && (
                            <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-3">
                                {badge}
                            </span>
                        )}
                        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-muted-foreground mt-1">{subtitle}</p>
                        )}
                    </div>
                    <Link href={viewAllLink}>
                        <Button variant="outline" className="gap-2 hidden sm:flex">
                            View All
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {/* Carousel */}
                <Carousel
                    opts={{ align: "start", loop: true }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-4">
                        {products.map((product) => (
                            <CarouselItem key={product.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4 xl:basis-1/5">
                                <div className="bg-white h-full flex flex-col p-2 sm:p-4 border border-gray-100 rounded-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                    {/* Image */}
                                    <Link href={`/products/${product.slug}`} className="block relative w-full aspect-square mb-2 bg-[#F7F7F7] flex items-center justify-center p-4">
                                        {/* Simple Image centering */}
                                        <div className="relative w-full h-full">
                                            {/* Note: In a real app we'd use the actual product image. Using placeholder logic if no image */}
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <ShoppingCart className="h-10 w-10 opacity-20" />
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Info */}
                                    <div className="flex-1 flex flex-col items-start gap-1">
                                        <Link href={`/products/${product.slug}`}>
                                            <h3 className="font-sans text-[16px] text-[#0F1111] leading-snug line-clamp-2 hover:text-[#C7511F] hover:underline cursor-pointer">
                                                {product.name}
                                            </h3>
                                        </Link>

                                        {/* Rating */}
                                        <div className="flex items-center gap-1">
                                            <div className="flex text-[#FFA41C]">
                                                {[1, 2, 3, 4].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                                                <Star className="h-4 w-4 fill-current opacity-50" />
                                            </div>
                                            <span className="text-xs text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">1,234</span>
                                        </div>

                                        {/* Price */}
                                        <div className="mt-1 flex items-baseline gap-1">
                                            <span className="text-xs relative -top-1.5">₹</span>
                                            <span className="text-[21px] md:text-[24px] font-medium text-[#0F1111] leading-none">
                                                {typeof product.price === 'number' ? Math.floor(product.price).toLocaleString() : product.price}
                                            </span>
                                            {/* Fraction (optional, if we had it) */}
                                            {/* <span className="text-xs relative -top-1.5">00</span> */}

                                            {/* MRP strikethrough */}
                                            {product.regularPrice && (
                                                <span className="text-[12px] text-[#565959] line-through ml-1">
                                                    M.R.P: ₹{product.regularPrice.toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Prime Badge (Static for UI) */}
                                        <div className="text-[#00A8E1] text-[13px] font-bold flex items-center gap-1 my-1">
                                            <Check className="h-4 w-4" /> <span className="text-[#565959] font-normal text-xs">Prime</span>
                                        </div>

                                        <div className="text-xs text-[#565959] mb-2">
                                            FREE Delivery by <span className="font-bold text-black">D-Fix</span>
                                        </div>

                                        {/* Add to Cart Button */}
                                        <div className="mt-auto w-full">
                                            <button
                                                onClick={(e) => handleAddToCart(e, product)}
                                                className={`w-full py-1.5 rounded-[100px] text-[13px] font-medium transition-all shadow-sm border border-transparent ${addedItems[product.id] || isInCart(product.id)
                                                    ? "bg-green-500 text-white hover:bg-green-600"
                                                    : "bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border-[#FCD200]"
                                                    }`}
                                            >
                                                {addedItems[product.id] ? "Added to Cart" : isInCart(product.id) ? "In Cart" : "Add to Cart"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex -left-5 top-1/3 w-12 h-20 bg-white/70 hover:bg-white border rounded-r-md rounded-l-none text-black shadow-md" />
                    <CarouselNext className="hidden md:flex -right-5 top-1/3 w-12 h-20 bg-white/70 hover:bg-white border rounded-l-md rounded-r-none text-black shadow-md" />
                </Carousel>

                {/* Mobile View All */}
                <div className="mt-6 text-center sm:hidden">
                    <Link href={viewAllLink}>
                        <Button variant="outline" className="gap-2">
                            View All
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div >
        </section >
    );
};
