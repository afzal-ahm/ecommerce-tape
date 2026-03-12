"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/utils";
import { AlertCircle, ChevronDown, ChevronLeft, Grid, List, Volume2 } from "lucide-react";
import { ProductCard } from "@/components/cards/ProductCard";
import { getImageUrl } from "@/lib/imageUrl";



// Product Skeleton
function ProductCardSkeleton() {
    return (
        <div className="bg-white rounded-xl overflow-hidden animate-pulse border border-gray-200">
            <div className="h-52 w-full bg-gray-100"></div>
            <div className="p-4">
                <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto mb-3"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3 mx-auto"></div>
            </div>
        </div>
    );
}

export default function CategoryPage() {
    const params = useParams();
    const { slug } = params;
    const [category, setCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortOption, setSortOption] = useState("newest");
    const [viewMode, setViewMode] = useState("grid");

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        pages: 0,
    });

    useEffect(() => {
        const fetchCategoryAndProducts = async () => {
            setLoading(true);
            try {
                let sort = "createdAt";
                let order = "desc";

                switch (sortOption) {
                    case "newest": sort = "createdAt"; order = "desc"; break;
                    case "oldest": sort = "createdAt"; order = "asc"; break;
                    case "name-asc": sort = "name"; order = "asc"; break;
                    case "name-desc": sort = "name"; order = "desc"; break;
                    default: break;
                }

                const response = await fetchApi(
                    `/public/categories/${slug}/products?page=${pagination.page}&limit=${pagination.limit}&sort=${sort}&order=${order}`
                );

                setCategory(response.data.category);
                setProducts(response.data.products || []);
                setPagination(prev => response.data.pagination || prev);
            } catch (err) {
                console.error("Error fetching category:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchCategoryAndProducts();
        }
    }, [slug, pagination.page, pagination.limit, sortOption]);

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.pages) return;
        setPagination((prev) => ({ ...prev, page: newPage }));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSortChange = (e) => {
        setSortOption(e.target.value);
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    // Loading state
    if (loading && !category) {
        return (
            <div className="min-h-screen bg-white">
                <div className="py-12 md:py-16 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                            <div className="h-10 bg-gray-200 rounded w-1/2 mb-3"></div>
                            <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 py-10">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4">
                <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md w-full text-center">
                    <div className="w-14 h-14 mx-auto mb-5 bg-red-100 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-7 h-7 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Category Not Found</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <Link href="/categories" className="inline-flex items-center px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Categories
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative py-10 md:py-14 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-10 right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4">
                    {/* Breadcrumb */}
                    <div className="flex items-center text-sm mb-4">
                        <Link href="/" className="text-gray-500 hover:text-primary transition-colors">Home</Link>
                        <span className="mx-2 text-gray-400">/</span>
                        <Link href="/categories" className="text-gray-500 hover:text-primary transition-colors">Categories</Link>
                        <span className="mx-2 text-gray-400">/</span>
                        <span className="text-primary font-medium">{category?.name}</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-5">
                        {/* Category Image */}
                        {category?.image && (
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white border border-gray-200 overflow-hidden flex-shrink-0 shadow-sm">
                                <Image
                                    src={getImageUrl(category.image)}
                                    alt={category.name}
                                    width={96}
                                    height={96}
                                    className="w-full h-full object-contain p-3"
                                />
                            </div>
                        )}

                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-2">
                                <Volume2 className="w-3.5 h-3.5" />
                                {pagination.total} Products
                            </div>
                            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-1">
                                {category?.name}
                            </h1>
                            {category?.description && (
                                <p className="text-gray-600 max-w-2xl">{category.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Products Section */}
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="text-gray-600 text-sm">
                        Showing <span className="text-gray-900 font-semibold">{products.length}</span> of <span className="text-gray-900 font-semibold">{pagination.total}</span> products
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Mode */}
                        <div className="hidden sm:flex items-center bg-white rounded-lg p-1 border border-gray-200">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-primary text-white" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Sort */}
                        <div className="relative">
                            <select
                                value={sortOption}
                                onChange={handleSortChange}
                                className="appearance-none bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium cursor-pointer"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="name-asc">Name: A to Z</option>
                                <option value="name-desc">Name: Z to A</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {[...Array(12)].map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <Volume2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">No Products Found</h2>
                        <p className="text-gray-500 mb-6">This category doesn&apos;t have any products yet.</p>
                        <Link href="/products" className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                            Browse All Products
                        </Link>
                    </div>
                ) : (
                    <div className={`grid gap-4 md:gap-6 ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex justify-center items-center mt-10 gap-1.5">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {[...Array(pagination.pages)].map((_, i) => {
                            const page = i + 1;
                            if (page === 1 || page === pagination.pages || (page >= pagination.page - 1 && page <= pagination.page + 1)) {
                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`w-10 h-10 rounded-lg font-semibold text-sm transition-colors ${pagination.page === page
                                            ? "bg-primary text-white"
                                            : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            }
                            if ((page === 2 && pagination.page > 3) || (page === pagination.pages - 1 && pagination.page < pagination.pages - 2)) {
                                return <span key={page} className="text-gray-400 px-1">...</span>;
                            }
                            return null;
                        })}

                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronDown className="w-4 h-4 -rotate-90" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
