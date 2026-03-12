"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { ProductCard } from "@/components/cards/ProductCard";

export const TrendingProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetchApi("/public/products?trending=true&limit=12");
        setProducts(response.data.products || []);
      } catch (error) {
        console.error("Error fetching trending products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
    <section className="py-20 bg-white">
      <div className="section-container">
        {/* Header - Best Seller Style */}
        <div className="text-center mb-16 relative">
          <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight uppercase mb-4">
            <span className="text-black">TRENDING</span> <span className="text-[#F7941D]">PRODUCTS</span>
          </h2>
          <div className="w-20 h-[3px] bg-[#F7941D] mx-auto mb-6 rounded-full" />
          <p className="text-gray-400 font-medium tracking-widest uppercase text-[12px]">Most loved products by the community</p>
        </div>

        {/* Products Carousel */}
        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 md:-ml-6">
              {products.map((product) => (
                <CarouselItem key={product.id} className="pl-3 md:pl-6 basis-1/2 md:basis-1/3 lg:basis-1/5 xl:basis-1/6">
                  <ProductCard product={product} />
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Minimalist Controls */}
            <div className="flex justify-center gap-4 mt-12 md:mt-16">
              <CarouselPrevious className="relative inset-0 translate-y-0 h-14 w-14 border-2 border-black rounded-none bg-transparent hover:bg-black hover:text-white transition-all duration-300" />
              <Link href="/products?trending=true" className="h-14 border-2 border-black flex items-center px-10 font-display font-black text-sm tracking-[0.2em] hover:bg-black hover:text-white transition-all uppercase">
                View All Trending
              </Link>
              <CarouselNext className="relative inset-0 translate-y-0 h-14 w-14 border-2 border-black rounded-none bg-transparent hover:bg-black hover:text-white transition-all duration-300" />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default TrendingProducts;
