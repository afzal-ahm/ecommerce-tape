"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/utils";
import { getCategoryImageUrl } from "@/lib/imageUrl";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CategoriesCarousel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.6;
      const targetScroll = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

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

  if (loading) {
    return (
      <section className="py-4 bg-white border-b border-gray-100">
        <div className="section-container">
          <div className="flex gap-4 overflow-hidden justify-center">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-3 mt-2 w-14 mx-auto bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!categories.length) return null;

  return (
    <section className="py-8 bg-gray-50/30 border-b border-gray-100 w-full overflow-hidden group">
      <div className="section-container relative">
        {/* Navigation Arrows */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg border border-gray-100 rounded-full flex items-center justify-center -ml-5 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex hover:bg-black hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg border border-gray-100 rounded-full flex items-center justify-center -mr-5 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex hover:bg-black hover:text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="flex items-center justify-start gap-6 md:gap-10 overflow-x-auto pb-4 scrollbar-hide px-4"
          >
            {categories.slice(0, 10).map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="flex-shrink-0 group text-center min-w-[100px]"
              >
                {/* Square Card Container */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-[20px] overflow-hidden bg-white mx-auto shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-gray-50 group-hover:border-[#F7941D]/20 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-500 p-4 sm:p-6">
                  <Image
                    src={getCategoryImageUrl(category.image)}
                    alt={category.name}
                    fill
                    className="object-contain p-4 sm:p-5 transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100px, 130px"
                  />
                </div>
                {/* Label */}
                <h3 className="mt-3 font-sans text-[11px] sm:text-[12px] font-medium text-gray-600 group-hover:text-black transition-colors whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-1">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
