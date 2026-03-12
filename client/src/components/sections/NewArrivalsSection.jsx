"use client";

import { ProductCarousel } from "./ProductCarousel";
import { products } from "@/lib/products";

export const NewArrivalsSection = () => {
    // Get last 8 products as "new arrivals"
    const newArrivals = [...products].reverse().slice(0, 8);

    return (
        <div className="bg-muted">
            <ProductCarousel
                products={newArrivals}
                title="New Arrivals"
                subtitle="Check out our latest products"
                badge="🆕 Just Launched"
                viewAllLink="/products"
            />
        </div>
    );
};
