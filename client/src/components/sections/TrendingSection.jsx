"use client";

import { useState, useEffect } from "react";
import { ProductCarousel } from "./ProductCarousel";
import { products } from "@/lib/products";

export const TrendingSection = () => {
    const [trending, setTrending] = useState([]);

    useEffect(() => {
        // Shuffle only on client to avoid hydration mismatch
        const shuffled = [...products].sort(() => Math.random() - 0.5);
        setTrending(shuffled.slice(0, 8));
    }, []);

    // Show first 8 products initially (will be replaced after hydration)
    const initialProducts = products.slice(0, 8);

    return (
        <ProductCarousel
            products={trending.length > 0 ? trending : initialProducts}
            title="Trending Now"
            subtitle="Popular picks from our customers"
            badge="🔥 Hot"
            viewAllLink="/products"
        />
    );
};
