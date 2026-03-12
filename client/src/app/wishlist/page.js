"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/client-only";
import { fetchApi } from "@/lib/utils";
import { Trash2, Heart, ShoppingBag, AlertCircle } from "lucide-react";
import { ProductCard } from "@/components/cards/ProductCard";

export default function WishlistPage() {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const [wishlistItems, setWishlistItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/auth?redirect=/wishlist");
        }
    }, [isAuthenticated, loading, router]);

    useEffect(() => {
        const fetchWishlist = async () => {
            if (!isAuthenticated) return;
            setLoadingItems(true);
            setError("");

            try {
                const response = await fetchApi("/users/wishlist", {
                    credentials: "include",
                });
                setWishlistItems(response.data.wishlistItems || []);
            } catch (error) {
                console.error("Failed to fetch wishlist:", error);
                setError("Failed to load your wishlist. Please try again later.");
            } finally {
                setLoadingItems(false);
            }
        };

        fetchWishlist();
    }, [isAuthenticated]);

    const removeFromWishlist = async (wishlistItemId) => {
        try {
            await fetchApi(`/users/wishlist/${wishlistItemId}`, {
                method: "DELETE",
                credentials: "include",
            });
            setWishlistItems((current) =>
                current.filter((item) => item.id !== wishlistItemId)
            );
        } catch (error) {
            console.error("Failed to remove item from wishlist:", error);
            setError("Failed to remove item. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <ClientOnly>
            <div className="min-h-screen bg-white">
                {/* Header */}
                <section className="py-10 bg-gradient-section">
                    <div className="section-container">
                        <span className="section-badge mb-4">
                            <Heart className="w-4 h-4" />
                            My Wishlist
                        </span>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900">
                            Saved Items
                        </h1>
                        <p className="text-gray-600 mt-2">
                            {wishlistItems.length} {wishlistItems.length === 1 ? "item" : "items"} saved
                        </p>
                    </div>
                </section>

                <div className="section-container py-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {loadingItems ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse" />
                            ))}
                        </div>
                    ) : wishlistItems.length === 0 ? (
                        <div className="text-center py-16 max-w-md mx-auto">
                            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Heart className="h-10 w-10 text-gray-300" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Wishlist is Empty</h2>
                            <p className="text-gray-500 mb-8">
                                Start adding items you love by clicking the heart icon on products.
                            </p>
                            <Link href="/products">
                                <Button size="lg" className="btn-primary h-12 px-8 gap-2">
                                    <ShoppingBag className="h-5 w-5" />
                                    Start Shopping
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {wishlistItems.map((product) => (
                                <div key={product.id} className="relative group">
                                    <ProductCard product={product} />
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            removeFromWishlist(product.id);
                                        }}
                                        className="absolute top-3 right-3 z-30 p-2 bg-white rounded-full text-red-500 hover:bg-red-50 shadow-lg border border-red-100 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                                        title="Remove from wishlist"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ClientOnly>
    );
}
