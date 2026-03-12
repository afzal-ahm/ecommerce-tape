import { OurProducts } from "@/components/sections/OurProducts";
import { FeaturedProducts } from "@/components/sections/FeaturedProducts";
import { BestSellers } from "@/components/sections/BestSellers";
import { NewArrivals } from "@/components/sections/NewArrivals";
import CategoriesCarousel from "@/components/sections/CategoriesCarousel";
import HeroSection from "@/components/sections/HeroSection";
import { CustomerReviews } from "@/components/sections/CustomerReviews";
import { FlashSaleSection } from "@/components/sections/FlashSaleSection";
import { TrendingProducts } from "@/components/sections/TrendingProducts";

export default function Home() {
  return (
    <>
      <main>
        {/* Categories Carousel - Quick navigation */}
        <CategoriesCarousel />
        {/* Hero Section with prominent CTA */}
        <HeroSection />


        {/* Flash Sale - If active */}
        <FlashSaleSection />



        {/* Featured Products - Hero products */}
        <FeaturedProducts />

        {/* Best Sellers - Popular items */}
        <BestSellers />

        {/* Our Products */}
        <OurProducts />

        {/* Trending Products */}
        <TrendingProducts />

        {/* New Arrivals - Latest products */}
        <NewArrivals />

        {/* Customer Reviews - Social proof */}
        <CustomerReviews />
      </main>
    </>
  );
}
