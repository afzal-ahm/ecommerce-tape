"use client";

import { usePathname } from "next/navigation";

export default function ProductsLayout({ children }) {
    const pathname = usePathname();

    // Check if we're on a product detail page (has slug parameter)
    const isProductDetailPage =
        pathname.includes("/products/") && pathname.split("/").length > 2;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="px-2 md:px-4 py-4">
                <div className="flex gap-2 md:gap-8">
                    {/* Right Side - Main Content */}
                    <div
                        className={`${isProductDetailPage ? "w-full" : "flex-1"} min-w-0`}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
