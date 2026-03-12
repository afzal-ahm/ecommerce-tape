"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getImageUrl } from "@/lib/imageUrl";
import Link from "next/link";
import { fetchApi } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";



export default function CategoriesCarousel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetchApi("/public/categories");
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const scroll = (direction) => {
    const container = document.getElementById("categories-carousel-container");
    if (container) {
      const scrollAmount = 200;
      const newPosition = direction === "left" 
        ? container.scrollLeft - scrollAmount 
        : container.scrollLeft + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: "smooth" });
      setScrollPosition(newPosition);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-6 max-w-7xl mx-auto">
        <div className="flex gap-4 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-24 h-28 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <div className="w-full py-6 relative group max-w-7xl mx-auto">
      {/* Left Arrow */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 border border-gray-200"
      >
        <ChevronLeft className="h-5 w-5 text-gray-700" />
      </button>

      {/* Categories Container */}
      <div
        id="categories-carousel-container"
        className="flex gap-4 overflow-x-auto scrollbar-hide px-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="flex-shrink-0 flex flex-col items-center group/item"
          >
            <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 group-hover/item:border-primary group-hover/item:shadow-lg transition-all duration-300">
              {category.image ? (
                <Image
                  src={getImageUrl(category.image)}
                  alt={category.name}
                  fill
                  className="object-contain p-3 transition-transform group-hover/item:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Zap className="w-8 h-8 text-primary/40" />
                </div>
              )}
              
              {/* Product count badge */}
              {category._count?.products > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {category._count.products}
                </div>
              )}
            </div>
            <span className="mt-2 text-xs lg:text-sm text-center font-medium text-gray-700 group-hover/item:text-primary transition-colors line-clamp-2 max-w-[80px] lg:max-w-[100px]">
              {category.name}
            </span>
          </Link>
        ))}
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 border border-gray-200"
      >
        <ChevronRight className="h-5 w-5 text-gray-700" />
      </button>
    </div>
  );
}
