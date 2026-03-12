"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { fetchApi } from "./utils";
import { useAuth } from "./auth-context";
import { toast } from "sonner";

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const [wishlistItems, setWishlistItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch wishlist when user logs in
    useEffect(() => {
        if (isAuthenticated) {
            fetchWishlist();
        } else {
            setWishlistItems([]);
        }
    }, [isAuthenticated]);

    const fetchWishlist = async () => {
        setLoading(true);
        try {
            const response = await fetchApi("/users/wishlist", { credentials: "include" });
            if (response.success) {
                setWishlistItems(response.data.wishlistItems || []);
            }
        } catch (error) {
            console.error("Failed to fetch wishlist:", error);
        } finally {
            setLoading(false);
        }
    };

    const isInWishlist = (productId) => {
        return wishlistItems.some((item) => item.product?.id === productId || item.productId === productId);
    };

    const addToWishlist = async (product) => {
        if (!isAuthenticated) {
            toast.error("Please login to add items to wishlist");
            return false;
        }

        // Optimistic update
        const tempId = Date.now().toString();
        const newItem = {
            id: tempId,
            productId: product.id,
            product: product,
            temp: true
        };

        setWishlistItems((prev) => [newItem, ...prev]);

        try {
            const response = await fetchApi("/users/wishlist", {
                method: "POST",
                credentials: "include",
                body: JSON.stringify({ productId: product.id }),
            });

            if (response.success) {
                // Replace temp item with real one from server
                setWishlistItems((prev) =>
                    prev.map((item) => item.id === tempId ? response.data.wishlistItem : item)
                );
                toast.success("Added to wishlist");
                return true;
            }
        } catch (error) {
            // Revert on failure
            setWishlistItems((prev) => prev.filter((item) => item.id !== tempId));

            if (error.message?.includes("already in wishlist")) {
                toast.info("Item is already in your wishlist");
            } else {
                toast.error("Failed to add to wishlist");
            }
            console.error(error);
            return false;
        }
    };

    const removeFromWishlist = async (productId) => {
        if (!isAuthenticated) return false;

        const item = wishlistItems.find((item) => item.product?.id === productId || item.productId === productId);
        if (!item) return false;

        // Optimistic update
        const previousItems = [...wishlistItems];
        setWishlistItems((prev) => prev.filter((i) => i.id !== item.id));

        try {
            const response = await fetchApi(`/users/wishlist/${item.id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.success) {
                toast.success("Removed from wishlist");
                return true;
            }
        } catch (error) {
            // Revert
            setWishlistItems(previousItems);
            toast.error("Failed to remove from wishlist");
            console.error(error);
            return false;
        }
    };

    const toggleWishlist = async (product) => {
        if (isInWishlist(product.id)) {
            await removeFromWishlist(product.id);
        } else {
            await addToWishlist(product);
        }
    };

    return (
        <WishlistContext.Provider
            value={{
                wishlistItems,
                loading,
                isInWishlist,
                addToWishlist,
                removeFromWishlist,
                toggleWishlist,
                refreshWishlist: fetchWishlist
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error("useWishlist must be used within a WishlistProvider");
    }
    return context;
}
