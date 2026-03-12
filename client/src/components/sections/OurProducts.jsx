"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/imageUrl";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
} from "@/components/ui/carousel";

export function OurProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetchApi("/public/products?ourProduct=true&limit=12");
                setProducts(response.data.products || []);
            } catch (error) {
                console.error("Error fetching our products:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    if (loading) {
        return (
            <section className="py-4 bg-white border-b border-gray-200">
                <div className="section-container">
                    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
                    <div className="flex gap-4 overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-48 h-48 bg-gray-200 rounded-md animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (!products.length) return null;

    return (
        <section className="py-8 bg-white border-t border-b border-gray-100">
            <div className="container mx-auto px-4 md:px-6">
                {/* Header - Amazon Style */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                            Min. 30% off
                        </h2>
                        <div className="hidden sm:block text-gray-300 text-2xl">|</div>
                        <h3 className="text-lg md:text-xl font-medium text-gray-800">
                            Our Products
                        </h3>
                        <div className="hidden sm:block text-gray-300 text-2xl">|</div>
                        <p className="text-sm md:text-base text-gray-500">
                            Exclusive Collection
                        </p>
                    </div>
                    <Link
                        href="/products?ourProduct=true"
                        className="text-[#007185] hover:text-[#C7511F] hover:underline text-sm font-medium whitespace-nowrap transition-colors"
                    >
                        See all offers
                    </Link>
                </div>

                {/* Products Carousel */}
                <div className="relative">
                    <Carousel
                        opts={{
                            align: "start",
                            loop: false,
                            dragFree: true,
                        }}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-4">
                            {products.map((product) => (
                                <CarouselItem key={product.id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                                    <Link href={`/products/${product.slug}`} className="block group h-full">
                                        <div className="bg-gray-50 p-4 h-full rounded-lg hover:shadow-md transition-shadow duration-300">
                                            <div className="relative aspect-square overflow-hidden mb-2 bg-white mix-blend-multiply">
                                                <Image
                                                    src={getProductImageUrl(product)}
                                                    alt={product.name}
                                                    fill
                                                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                                                />
                                            </div>
                                        </div>
                                    </Link>
                                </CarouselItem>
                            ))}
                        </CarouselContent>

                        <div className="hidden md:block">
                            <CarouselPrevious className="h-12 w-12 border shadow-md bg-white/90 hover:bg-white -left-6" />
                            <CarouselNext className="h-12 w-12 border shadow-md bg-white/90 hover:bg-white -right-6" />
                        </div>
                    </Carousel>
                </div>
            </div>
        </section>
    );
}

export default OurProducts;
