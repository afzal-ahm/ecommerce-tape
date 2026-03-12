"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/utils";
import { AlertCircle, ArrowRight, Grid3X3, Package, Zap, Headphones } from "lucide-react";
import { getCategoryImageUrl } from "@/lib/imageUrl";



const CategoryCard = ({ category, index }) => {
    return (
        <div className="group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <Link href={`/category/${category.slug}`}>
                <div className="card-premium h-full hover:border-primary/20">
                    {/* Image */}
                    <div className="relative h-40 w-full overflow-hidden bg-gray-50 rounded-t-2xl">
                        <Image
                            src={getCategoryImageUrl(category.image)}
                            alt={category.name}
                            fill
                            className="object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute top-3 right-3 bg-primary text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg">
                            {category._count?.products || 0}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                            {category.name}
                        </h3>
                        <p className="text-gray-500 text-xs mb-3 line-clamp-2">
                            {category.description || "Explore our products"}
                        </p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                                {category._count?.products || 0} products
                            </span>
                            <span className="flex items-center text-primary font-medium text-xs gap-1 group-hover:gap-2 transition-all">
                                View <ArrowRight className="w-3 h-3" />
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};

const CategoryCardSkeleton = () => (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse border border-gray-100">
        <div className="h-40 w-full bg-gray-100"></div>
        <div className="p-4 border-t border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-full mb-1"></div>
            <div className="h-3 bg-gray-100 rounded w-5/6 mb-3"></div>
            <div className="flex justify-between">
                <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
        </div>
    </div>
);

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const response = await fetchApi("/public/categories");
                setCategories(response.data.categories || []);
            } catch (err) {
                console.error("Error fetching categories:", err);
                setError(err.message || "Failed to load categories");
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const totalProducts = categories.reduce((sum, cat) => sum + (cat._count?.products || 0), 0);

    return (
        <div className="min-h-screen bg-white">
            {/* Hero */}
            <section className="py-12 md:py-16 bg-gradient-section">
                <div className="section-container text-center">
                    <span className="section-badge mb-4">
                        <Grid3X3 className="w-4 h-4" />
                        Browse Categories
                    </span>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-gray-900 mb-4">
                        Shop by <span className="text-primary">Category</span>
                    </h1>
                    <p className="text-gray-600 max-w-xl mx-auto">
                        Browse our wide range of product categories
                    </p>
                </div>
            </section>

            {/* Breadcrumb */}
            <div className="section-container py-4">
                <div className="flex items-center text-sm">
                    <Link href="/" className="text-gray-500 hover:text-primary transition-colors">Home</Link>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-primary font-medium">Categories</span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="section-container mb-6">
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start">
                        <AlertCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0 w-5 h-5" />
                        <div>
                            <h3 className="font-medium text-red-800 mb-1">Error Loading Categories</h3>
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="section-container pb-16">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {[...Array(10)].map((_, index) => (
                            <CategoryCardSkeleton key={index} />
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">No Categories Found</h2>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            We&apos;re adding new categories soon. Check back later!
                        </p>
                        <Link href="/products">
                            <button className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                                Browse All Products
                            </button>
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Categories Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {categories.map((category, index) => (
                                <CategoryCard key={category.id} category={category} index={index} />
                            ))}
                        </div>

                        {/* Stats */}
                        <div className="mt-12 bg-[#2D2D2D] rounded-2xl p-6 md:p-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                                <div>
                                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 text-primary">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div className="text-2xl font-bold text-white">{categories.length}</div>
                                    <div className="text-sm text-gray-400">Categories</div>
                                </div>
                                <div>
                                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 text-primary">
                                        <Grid3X3 className="w-5 h-5" />
                                    </div>
                                    <div className="text-2xl font-bold text-white">{totalProducts}</div>
                                    <div className="text-sm text-gray-400">Products</div>
                                </div>
                                <div>
                                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 text-primary">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div className="text-2xl font-bold text-white">100%</div>
                                    <div className="text-sm text-gray-400">Genuine</div>
                                </div>
                                <div>
                                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 text-primary">
                                        <Headphones className="w-5 h-5" />
                                    </div>
                                    <div className="text-2xl font-bold text-white">24/7</div>
                                    <div className="text-sm text-gray-400">Support</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
