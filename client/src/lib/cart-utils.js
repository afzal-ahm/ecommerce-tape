// Universal Cart Utilities
// This file provides reusable functions for cart operations across the app

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "./cart-context";
import { fetchApi } from "./utils";
import { useAuth } from "./auth-context";

// Universal add to cart function that can be used in any component
export const useUniversalAddToCart = () => {
    const { addToCart } = useCart();

    const universalAddToCart = async (
        productVariantId,
        quantity = 1,
        productName = "Product"
    ) => {
        try {
            await addToCart(productVariantId, quantity);
            toast.success(`${productName} added to cart`);
            return { success: true };
        } catch (error) {
            console.error("Error adding to cart:", error);
            toast.error("Failed to add product to cart");
            return { success: false, error };
        }
    };

    return { universalAddToCart };
};

// Function to handle product with variants
export const useAddProductToCart = () => {
    const { addToCart } = useCart();

    const addProductToCart = async (product, quantity = 1) => {
        try {
            // If product has no variants, try to get default variant from backend
            if (!product || !product.variants || product.variants.length === 0) {
                const response = await fetchApi(`/public/products/${product.slug}`);
                const productData = response.data.product;
                const variants = productData?.variants || [];

                if (variants.length === 0) {
                    toast.error("This product is currently not available");
                    return { success: false, error: "Product not available" };
                }

                // Use first variant as default
                const variantId = variants[0].id;
                await addToCart(variantId, quantity);
                toast.success(`${product.name} added to cart`);
                return { success: true };
            } else {
                // Get the first variant (default)
                const variantId = product.variants[0].id;
                await addToCart(variantId, quantity);
                toast.success(`${product.name} added to cart`);
                return { success: true };
            }
        } catch (error) {
            console.error("Error adding product to cart:", error);
            toast.error("Failed to add product to cart");
            return { success: false, error };
        }
    };

    return { addProductToCart };
};

// Function to handle variant selection and add to cart
export const useAddVariantToCart = () => {
    const { addToCart } = useCart();

    const addVariantToCart = async (
        selectedVariant,
        quantity = 1,
        productName = "Product"
    ) => {
        try {
            if (!selectedVariant) {
                toast.error("Please select a product variant");
                return { success: false, error: "No variant selected" };
            }

            await addToCart(selectedVariant.id, quantity);
            toast.success(`${productName} added to cart`);
            return { success: true };
        } catch (error) {
            console.error("Error adding variant to cart:", error);
            toast.error("Failed to add product to cart");
            return { success: false, error };
        }
    };

    return { addVariantToCart };
};

// Function to check if user can proceed to checkout
export const useCheckoutGuard = () => {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    const proceedToCheckout = (redirectUrl = "/checkout") => {
        if (!isAuthenticated) {
            router.push(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
            return false;
        }
        router.push(redirectUrl);
        return true;
    };

    return { proceedToCheckout };
};
