"use client";

import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";

export function VariantSelector({ product }) {
    // Check if product has variant group items
    const groupItems = product?.variantGroup?.items;

    if (!groupItems || groupItems.length === 0) return null;

    return (
        <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 text-gray-900">Select Quantity:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {groupItems.map((item) => {
                    const isSelected = item.productId === product.id;
                    const targetProduct = item.product;

                    if (!targetProduct) return null;

                    // Pricing Logic (Backend: price = MRP, salePrice = Selling Price)
                    const mrp = parseFloat(targetProduct.price || 0);
                    const sellingPrice = parseFloat(targetProduct.salePrice || targetProduct.price || 0);

                    // Calculate Unit Price
                    // Extract number from label (e.g. "10 Pieces" -> 10)
                    const quantityMatch = item.label.match(/(\d+)/);
                    const quantity = quantityMatch ? parseInt(quantityMatch[0]) : 1;
                    const unitPrice = quantity > 0 ? (sellingPrice / quantity).toFixed(2) : sellingPrice.toFixed(2);

                    // Calculate Discount Percentage
                    let discount = 0;
                    if (mrp > sellingPrice) {
                        discount = Math.round(((mrp - sellingPrice) / mrp) * 100);
                    }

                    return (
                        <Link
                            key={item.id}
                            href={`/products/${targetProduct.slug}`}
                            className={cn(
                                "group relative border rounded-xl p-3 transition-all hover:border-[#F7941D] hover:shadow-md bg-white flex flex-col justify-between h-full",
                                isSelected
                                    ? "border-[#F7941D] ring-1 ring-[#F7941D] bg-orange-50/30"
                                    : "border-gray-200"
                            )}
                        >
                            {/* Header: Label (Quantity) */}
                            <div className="mb-2">
                                <span className={cn(
                                    "text-sm font-semibold",
                                    isSelected ? "text-gray-900" : "text-gray-700"
                                )}>
                                    {item.label}
                                </span>
                            </div>

                            {/* Price Section */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-lg font-bold text-gray-900">
                                        {formatCurrency(sellingPrice)}
                                    </span>
                                    {mrp > sellingPrice && (
                                        <span className="text-xs text-muted-foreground line-through">
                                            {formatCurrency(mrp)}
                                        </span>
                                    )}
                                </div>
                                {mrp > sellingPrice && discount > 0 && (
                                    <span className="text-xs font-medium text-[#F7941D]">
                                        {discount}% Off
                                    </span>
                                )}
                                <div className="text-[10px] text-gray-500 font-medium">
                                    ({formatCurrency(unitPrice)} / piece)
                                </div>
                            </div>

                            {/* Selected Checkmark (Optional visual flair) */}
                            {isSelected && (
                                <div className="absolute top-0 right-0 p-1.5">
                                    <div className="h-3 w-3 rounded-full bg-[#F7941D]" />
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
