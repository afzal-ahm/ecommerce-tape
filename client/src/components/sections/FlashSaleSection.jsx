"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi, formatCurrency } from "@/lib/utils";
import { getImageUrl } from "@/lib/imageUrl";
import { Clock, Zap, ChevronRight, Loader2, Flame, Timer, ShoppingBag } from "lucide-react";

// Helper function to format image URLs


// Premium Countdown Timer Component
const CountdownTimer = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(endTime).getTime() - new Date().getTime();
            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / (1000 * 60)) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                };
            }
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [endTime]);

    const TimeBlock = ({ value, label }) => (
        <div className="flex flex-col items-center">
            <div className="bg-white text-gray-900 rounded-lg px-3 py-2 min-w-[50px] shadow-lg border-2 border-primary/20">
                <span className="text-2xl md:text-3xl font-bold font-mono">
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span className="text-xs text-gray-600 mt-1 font-medium uppercase tracking-wide">{label}</span>
        </div>
    );

    return (
        <div className="flex items-center gap-2 md:gap-3">
            {timeLeft.days > 0 && (
                <>
                    <TimeBlock value={timeLeft.days} label="Days" />
                    <span className="text-2xl font-bold text-primary">:</span>
                </>
            )}
            <TimeBlock value={timeLeft.hours} label="Hours" />
            <span className="text-2xl font-bold text-primary">:</span>
            <TimeBlock value={timeLeft.minutes} label="Mins" />
            <span className="text-2xl font-bold text-primary">:</span>
            <TimeBlock value={timeLeft.seconds} label="Secs" />
        </div>
    );
};

// Flash Sale Product Card - Premium Design
const FlashSaleProductCard = ({ product, discountPercentage }) => {
    return (
        <Link href={`/products/${product.slug}`} className="group block">
            <div className="relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100">
                {/* Discount Ribbon */}
                <div className="absolute top-0 right-0 z-10">
                    <div className="bg-gradient-to-br from-red-500 to-orange-500 text-white px-4 py-2 rounded-bl-2xl shadow-lg">
                        <div className="flex items-center gap-1">
                            <Flame className="w-4 h-4 animate-pulse" />
                            <span className="text-lg font-black">{discountPercentage}%</span>
                        </div>
                        <span className="text-xs font-medium">OFF</span>
                    </div>
                </div>

                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden bg-white border border-gray-200">
                    <Image
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        fill
                        className="object-contain p-2 group-hover:scale-110 transition-transform duration-700"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                        <span className="bg-white text-primary px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-xl">
                            <ShoppingBag className="w-4 h-4" />
                            View Deal
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    <h3 className="font-semibold text-gray-800 line-clamp-2 text-sm md:text-base mb-3 group-hover:text-primary transition-colors min-h-[40px]">
                        {product.name}
                    </h3>

                    {/* Prices */}
                    <div className="flex items-end gap-2 flex-wrap">
                        <span className="text-xl md:text-2xl font-bold text-primary">
                            {formatCurrency(product.salePrice)}
                        </span>
                        <span className="text-sm text-gray-400 line-through pb-0.5">
                            {formatCurrency(product.priceBeforeFlashSale || product.originalPrice)}
                        </span>
                    </div>

                    {/* Savings Badge */}
                    <div className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                        <span>You Save</span>
                        <span className="font-bold">
                            {formatCurrency((product.priceBeforeFlashSale || product.originalPrice) - product.salePrice)}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export function FlashSaleSection() {
    const [flashSales, setFlashSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFlashSales = async () => {
            try {
                setLoading(true);
                const response = await fetchApi("/public/flash-sales");
                if (response.success && response.data.flashSales?.length > 0) {
                    setFlashSales(response.data.flashSales);
                }
            } catch (err) {
                console.error("Error fetching flash sales:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFlashSales();
    }, []);

    // Don't render if no active flash sales
    if (loading) {
        return (
            <section className="py-12 md:py-16 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                </div>
            </section>
        );
    }

    if (!flashSales.length || error) {
        return null;
    }

    const currentSale = flashSales[0];

    return (
        <section className="py-20 bg-white border-y border-gray-50">
            <div className="section-container">
                {/* Header - Premium D2C Style */}
                <div className="text-center mb-16 relative">
                    <h2 className="font-display text-4xl md:text-5xl font-black text-black tracking-tight uppercase mb-4">
                        FLASH <span className="text-[#F7941D]">SALE</span>
                    </h2>
                    <div className="w-24 h-1 bg-[#F7941D] mx-auto mb-6" />
                    <p className="text-gray-500 font-medium tracking-widest uppercase text-xs">Limited time deals on your favorites</p>
                </div>

                {/* Timer Section - Centered and Clean */}
                <div className="flex flex-col items-center gap-6 mb-16">
                    <div className="flex items-center gap-2 text-black/40 font-display font-black text-xs uppercase tracking-[0.2em]">
                        <Timer className="w-4 h-4" />
                        Offer Ends In:
                    </div>
                    <CountdownTimer endTime={currentSale.endTime} />
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {currentSale.products.slice(0, 10).map((product) => (
                        <FlashSaleProductCard
                            key={product.id}
                            product={product}
                            discountPercentage={currentSale.discountPercentage}
                        />
                    ))}
                </div>

                {/* View All Button */}
                {currentSale.products.length > 5 && (
                    <div className="text-center mt-10">
                        <Link
                            href="/products?flashSale=true"
                            className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                        >
                            <Flame className="w-5 h-5" />
                            View All Flash Deals
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}

export default FlashSaleSection;
