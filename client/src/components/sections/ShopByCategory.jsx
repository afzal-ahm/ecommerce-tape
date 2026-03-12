"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/utils";
import { getImageUrl } from "@/lib/imageUrl";

export function ShopByCategory() { // Keeping component name constant to avoid external import breakages
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        // Fetch all brands from the dedicated endpoint
        const response = await fetchApi("/public/brands");

        if (response.success && response.data.brands) {
          setBrands(response.data.brands);
        }
      } catch (error) {
        console.error("Error fetching brands:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-gray-50/50">
        <div className="section-container">
          <div className="flex justify-center mb-10">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-full bg-gray-200 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!brands.length) return null;

  return (
    <section className="py-20 bg-gray-50/50">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-16 relative">
          <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight uppercase mb-4">
            TOP <span className="text-[#F7941D]">BRANDS</span>
          </h2>
          <div className="w-20 h-[3px] bg-[#F7941D] mx-auto mb-6 rounded-full" />
          <p className="text-gray-400 font-medium tracking-widest uppercase text-[12px]">Our premium partners</p>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 justify-items-center">
          {brands.slice(0, 12).map((brand) => (
            <Link
              key={brand.id}
              href={`/products?brand=${brand.slug}`}
              className="group flex flex-col items-center justify-center gap-4 hover:-translate-y-1 transition-transform duration-300 w-full"
            >
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] group-hover:border-[#F7941D] transition-all duration-300 overflow-hidden">
                <div className="relative w-20 h-20 md:w-28 md:h-28">
                  <Image
                    src={getImageUrl(brand.image || brand.logo)}
                    alt={brand.name}
                    fill
                    className="object-contain transition-all duration-300 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 15vw"
                  />
                </div>
              </div>
              <span className="font-display font-bold text-sm tracking-widest uppercase text-gray-500 group-hover:text-black transition-colors">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 text-center">
          <Link href="/products" className="font-display text-xs font-black tracking-[0.3em] text-gray-400 hover:text-black transition-colors uppercase border-b-2 border-gray-100 pb-1">
            Discover All Partners
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ShopByCategory;
