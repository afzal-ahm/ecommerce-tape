"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/dynamic-icon";
import { fetchApi, formatCurrency, formatDate } from "@/lib/utils";

export default function OrdersPage() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 0 });
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [error, setError] = useState("");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")) : 1;

    useEffect(() => {
        const fetchOrders = async () => {
            if (!isAuthenticated) return;
            setLoadingOrders(true);
            setError("");
            try {
                const response = await fetchApi(`/payment/orders?page=${page}&limit=10`, { credentials: "include" });
                setOrders(response.data.orders || []);
                setPagination(response.data.pagination || { total: 0, page: 1, limit: 10, pages: 0 });
            } catch (error) {
                console.error("Failed to fetch orders:", error);
                setError("Failed to load your orders. Please try again later.");
            } finally { setLoadingOrders(false); }
        };
        fetchOrders();
    }, [isAuthenticated, page]);

    const getStatusColor = (status) => {
        const statusColors = { PENDING: "bg-yellow-100 text-yellow-800", PROCESSING: "bg-blue-100 text-blue-800", SHIPPED: "bg-indigo-100 text-indigo-800", DELIVERED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800", REFUNDED: "bg-purple-100 text-purple-800" };
        return statusColors[status] || "bg-gray-100 text-gray-800";
    };

    const getPaymentIcon = (method) => {
        const methodIcons = { CARD: "CreditCard", NETBANKING: "Building", WALLET: "Wallet", UPI: "Smartphone", EMI: "Calendar", OTHER: "IndianRupee" };
        return methodIcons[method] || "IndianRupee";
    };

    const changePage = (newPage) => {
        if (newPage < 1 || newPage > pagination.pages) return;
        router.push(`/account/orders?page=${newPage}`);
    };

    const getRecentOrderTitle = (order) => {
        if (!order || !order.items || order.items.length === 0) return `Order #${order?.orderNumber || ""}`.trim();
        const firstItem = order.items[0];
        return (
            firstItem.product?.name ||
            firstItem.productName ||
            `Order #${order.orderNumber}`
        );
    };

    return (
        <>
            <h1 className="text-3xl font-bold mb-8">My Orders</h1>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

            {orders.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 shadow-sm p-5 mb-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                        <div>
                            <div className="text-lg font-medium text-blue-800 mb-1">
                                Recent Order: {getRecentOrderTitle(orders[0])}
                            </div>
                            <p className="text-xs text-blue-700 mb-1">
                                Order #{orders[0].orderNumber}
                            </p>
                            <p className="text-sm text-gray-600 mb-3">Placed on {formatDate(orders[0].date)} • {orders[0].items.length} {orders[0].items.length === 1 ? "item" : "items"} • {formatCurrency(orders[0].total)}</p>
                            <span className={`px-2.5 py-1 ${getStatusColor(orders[0].status)} text-xs font-medium rounded-full inline-block`}>{orders[0].status}</span>
                        </div>
                        <Button className="mt-4 md:mt-0" onClick={() => router.push(`/account/orders/${orders[0].id}`)}><DynamicIcon name="Eye" className="mr-2 h-4 w-4" />View Order Details</Button>
                    </div>
                </div>
            )}

            {loadingOrders ? (
                <div className="bg-white rounded-lg shadow p-8 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
            ) : orders.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <DynamicIcon name="ShoppingBag" className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Orders Found</h2>
                    <p className="text-gray-600 mb-6">You haven&apos;t placed any orders yet.</p>
                    <Link href="/products"><Button>Start Shopping</Button></Link>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 cursor-pointer transition-all" onClick={() => router.push(`/account/orders/${order.id}`)}>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">#{order.orderNumber}</div><div className="text-sm text-gray-500">{order.items.length} {order.items.length === 1 ? "item" : "items"}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{formatDate(order.date)}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>{order.status}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900 font-medium">{formatCurrency(order.total)}</div>{order.discount > 0 && <div className="text-xs text-green-600">Saved {formatCurrency(order.discount)}</div>}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center text-sm text-gray-900"><DynamicIcon name={getPaymentIcon(order.paymentMethod)} className="h-4 w-4 mr-1 text-gray-500" />{order.paymentMethod}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><Link href={`/account/orders/${order.id}`} className="text-primary hover:text-primary/80" onClick={(e) => e.stopPropagation()}>View Details</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination.pages > 1 && (
                        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                            <p className="text-sm text-gray-700">Page <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{pagination.pages}</span></p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => changePage(pagination.page - 1)} disabled={pagination.page === 1}>Previous</Button>
                                <Button variant="outline" onClick={() => changePage(pagination.page + 1)} disabled={pagination.page === pagination.pages}>Next</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
