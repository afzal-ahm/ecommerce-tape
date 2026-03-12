"use client";

import { ProductCarousel } from "./ProductCarousel";
import { products } from "@/lib/products";

export const BestSellersSection = () => {
    // Sort by price (highest as proxy for best sellers)
    const bestSellers = [...products].sort((a, b) => b.price - a.price).slice(0, 8);

    return (
        <div className="bg-muted">
            <ProductCarousel
                products={bestSellers}
                title="Best Sellers"
                subtitle="Our most popular products"
                badge="⭐ Top Rated"
                viewAllLink="/products"
            />
        </div>
    );
};
