"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/dynamic-icon";
import { fetchApi, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/imageUrl";



export default function OrderDetailPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orderId = params.orderId;

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/auth?redirect=/account/orders");
            return;
        }

        const fetchOrder = async () => {
            if (!isAuthenticated || !orderId) return;
            setLoading(true);
            setError("");
            try {
                const response = await fetchApi(`/users/orders/${orderId}`, { credentials: "include" });
                if (response.success) {
                    setOrder(response.data.order);
                } else {
                    setError(response.message || "Failed to load order details.");
                }
            } catch (err) {
                console.error("Failed to fetch order:", err);
                setError("Failed to load order details. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [isAuthenticated, authLoading, orderId, router]);


    const getStatusColor = (status) => {
        const statusColors = {
            PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
            PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
            SHIPPED: "bg-indigo-100 text-indigo-800 border-indigo-200",
            DELIVERED: "bg-green-100 text-green-800 border-green-200",
            CANCELLED: "bg-red-100 text-red-800 border-red-200",
            REFUNDED: "bg-purple-100 text-purple-800 border-purple-200",
        };
        return statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
    };

    const getPaymentStatusColor = (status) => {
        const colors = {
            PENDING: "text-yellow-600",
            SUCCESS: "text-green-600",
            CAPTURED: "text-green-600",
            FAILED: "text-red-600",
            REFUNDED: "text-purple-600",
        };
        return colors[status] || "text-gray-600";
    };

    // Derive payment status
    const paymentStatus = order?.razorpayPayment?.status || 
                         (order?.paymentMethod === "CASH" ? "PENDING" : 
                         order?.paymentStatus || "N/A");

    if (loading || authLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500">Loading order details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-lg text-center">
                <DynamicIcon name="AlertCircle" className="h-12 w-12 mx-auto mb-4 text-red-400" />
                <h2 className="text-xl font-semibold mb-2">Error Loading Order</h2>
                <p className="mb-4">{error}</p>
                <Button variant="outline" onClick={() => router.push("/account/orders")}>
                    <DynamicIcon name="ArrowLeft" className="mr-2 h-4 w-4" /> Back to Orders
                </Button>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="bg-gray-50 border border-gray-200 px-6 py-8 rounded-lg text-center">
                <DynamicIcon name="Package" className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
                <p className="text-gray-600 mb-4">The order you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                <Button variant="outline" onClick={() => router.push("/account/orders")}>
                    <DynamicIcon name="ArrowLeft" className="mr-2 h-4 w-4" /> Back to Orders
                </Button>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link href="/account/orders" className="text-gray-500 hover:text-gray-700">
                            <DynamicIcon name="ArrowLeft" className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-bold">Order #{order.orderNumber}</h1>
                    </div>
                    <p className="text-gray-500">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <span className={`px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Items */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-semibold text-lg">Order Items ({order.items?.length || 0})</h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {order.items?.map((item) => {
                                const productImage = item.variant?.images?.[0] || item.product?.images?.[0];
                                return (
                                    <div key={item.id} className="p-6 flex gap-4">
                                        <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-gray-200">
                                            <Image
                                                src={getImageUrl(productImage)}
                                                alt={item.productName || item.product?.name || "Product"}
                                                fill
                                                className="object-contain p-1"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                href={`/products/${item.product?.slug || "#"}`}
                                                className="font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2"
                                            >
                                                {item.productName || item.product?.name}
                                            </Link>
                                            {item.variant?.options && item.variant.options.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {item.variant.options.map((opt, idx) => (
                                                        <span key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                            {opt.name}: {opt.value}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {item.flashSale && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                                        ⚡ {item.flashSale.name || "Flash Sale"}
                                                    </span>
                                                    <span className="text-xs text-gray-400">-{item.flashSale.discountPercentage}% OFF</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                                                <div className="text-right">
                                                    {item.flashSale?.originalPrice && (
                                                        <span className="text-xs text-gray-400 line-through mr-2">
                                                            {formatCurrency(item.flashSale.originalPrice * item.quantity)}
                                                        </span>
                                                    )}
                                                    <span className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tracking Info */}
                    {order.tracking && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h2 className="font-semibold text-lg">Tracking Information</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <DynamicIcon name="Truck" className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="font-medium">{order.tracking.carrier || "Carrier"}</p>
                                        <p className="text-sm text-gray-500">Tracking #: {order.tracking.trackingNumber}</p>
                                    </div>
                                </div>
                                {order.tracking.estimatedDelivery && (
                                    <p className="text-sm text-gray-600 mb-4">
                                        <span className="font-medium">Estimated Delivery:</span> {formatDate(order.tracking.estimatedDelivery)}
                                    </p>
                                )}
                                {order.tracking.updates && order.tracking.updates.length > 0 && (
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <h3 className="font-medium text-sm mb-3">Tracking Updates</h3>
                                        <div className="space-y-3">
                                            {order.tracking.updates.map((update, idx) => (
                                                <div key={idx} className="flex gap-3">
                                                    <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0"></div>
                                                    <div>
                                                        <p className="text-sm font-medium">{update.status}</p>
                                                        <p className="text-xs text-gray-500">{formatDate(update.createdAt)}</p>
                                                        {update.location && <p className="text-xs text-gray-500">{update.location}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Order Summary Sidebar */}
                <div className="space-y-6">
                    {/* Price Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-semibold text-lg">Order Summary</h2>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span>{formatCurrency(order.subTotal)}</span>
                            </div>
                            {order.discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(order.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Shipping</span>
                                <span>{order.shippingCost > 0 ? formatCurrency(order.shippingCost) : "Free"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax</span>
                                <span>{formatCurrency(order.tax)}</span>
                            </div>
                            {order.codCharge > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">COD Surcharge</span>
                                    <span>{formatCurrency(order.codCharge)}</span>
                                </div>
                            )}
                            <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between font-semibold text-lg">
                                <span>Total</span>
                                <span className="text-primary">{formatCurrency(order.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-semibold text-lg">Payment Details</h2>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Method</span>
                                <span className="font-medium">{order.paymentMethod || "N/A"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Status</span>
                                <span className={`font-medium ${getPaymentStatusColor(paymentStatus)}`}>
                                    {paymentStatus}
                                </span>
                            </div>
                            {order.razorpayPayment?.razorpayPaymentId && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Transaction ID</span>
                                    <span className="font-mono text-xs">{order.razorpayPayment.razorpayPaymentId}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shipping Address */}
                    {order.shippingAddress && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h2 className="font-semibold text-lg">Shipping Address</h2>
                            </div>
                            <div className="p-6">
                                <p className="font-medium">{order.shippingAddress.name}</p>
                                <p className="text-sm text-gray-600 mt-1">{order.shippingAddress.street}</p>
                                <p className="text-sm text-gray-600">
                                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                                </p>
                                <p className="text-sm text-gray-600">{order.shippingAddress.country}</p>
                                {order.shippingAddress.phone && (
                                    <p className="text-sm text-gray-600 mt-2">
                                        <DynamicIcon name="Phone" className="inline h-4 w-4 mr-1" />
                                        {order.shippingAddress.phone}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <Link href="/account/orders">
                            <Button variant="outline" className="w-full">
                                <DynamicIcon name="ArrowLeft" className="mr-2 h-4 w-4" /> Back to Orders
                            </Button>
                        </Link>
                        <Link href="/products">
                            <Button className="w-full">
                                <DynamicIcon name="ShoppingBag" className="mr-2 h-4 w-4" /> Continue Shopping
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
