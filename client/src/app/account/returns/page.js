"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/dynamic-icon";
import { fetchApi, formatCurrency, formatDate } from "@/lib/utils";
import { ClientOnly } from "@/components/client-only";
import { ProtectedRoute } from "@/components/protected-route";

export default function ReturnsPage() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [returnRequests, setReturnRequests] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 0 });
    const [loadingReturns, setLoadingReturns] = useState(true);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")) : 1;

    useEffect(() => {
        const fetchReturns = async () => {
            if (!isAuthenticated) return;
            setLoadingReturns(true);
            setError("");
            try {
                const params = new URLSearchParams({ page: page.toString(), limit: "10" });
                if (statusFilter) params.append("status", statusFilter);
                const response = await fetchApi(`/returns/my-returns?${params.toString()}`, { credentials: "include" });
                setReturnRequests(response.data.returnRequests || []);
                setPagination(response.data.pagination || { total: 0, page: 1, limit: 10, pages: 0 });
            } catch (error) {
                console.error("Failed to fetch return requests:", error);
                setError("Failed to load return requests. Please try again later.");
            } finally { setLoadingReturns(false); }
        };
        fetchReturns();
    }, [isAuthenticated, page, statusFilter]);

    const getStatusColor = (status) => {
        const statusColors = { PENDING: "bg-yellow-100 text-yellow-800", APPROVED: "bg-green-100 text-green-800", REJECTED: "bg-red-100 text-red-800", PROCESSING: "bg-blue-100 text-blue-800", COMPLETED: "bg-purple-100 text-purple-800" };
        return statusColors[status] || "bg-gray-100 text-gray-800";
    };

    const changePage = (newPage) => {
        if (newPage < 1 || newPage > pagination.pages) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`/account/returns?${params.toString()}`);
    };

    return (
        <ProtectedRoute>
            <ClientOnly>
                <div>
                    <h1 className="text-3xl font-bold mb-8">My Return Requests</h1>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

                    <div className="mb-6 flex gap-4">
                        <select className="px-4 py-2 border rounded-md" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); router.push(`/account/returns?page=1`); }}>
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>

                    {loadingReturns ? (
                        <div className="bg-white rounded-lg shadow p-8 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
                    ) : returnRequests.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <DynamicIcon name="RotateCcw" className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <h2 className="text-xl font-semibold mb-2">No Return Requests</h2>
                            <p className="text-gray-600 mb-6">You haven&apos;t submitted any return requests yet.</p>
                            <Link href="/account/orders"><Button>View My Orders</Button></Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {returnRequests.map((returnReq) => (
                                <div key={returnReq.id} className="bg-white rounded-lg shadow p-6">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div><p className="text-sm text-gray-600">Order Number</p><p className="font-semibold">#{returnReq.order.orderNumber}</p></div>
                                                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-md ${getStatusColor(returnReq.status)}`}>{returnReq.status}</span>
                                            </div>
                                            <div className="mb-3"><p className="text-sm text-gray-600">Product</p><p className="font-medium">{returnReq.orderItem.product.name}</p><p className="text-sm text-gray-600">Quantity: {returnReq.orderItem.quantity} × {formatCurrency(returnReq.orderItem.price)}</p></div>
                                            <div className="mb-3"><p className="text-sm text-gray-600">Return Reason</p><p className="font-medium">{returnReq.reason}</p>{returnReq.customReason && <p className="text-sm text-gray-600 mt-1">{returnReq.customReason}</p>}</div>
                                            <div className="text-sm text-gray-600"><p>Requested on: {formatDate(returnReq.createdAt)}</p>{returnReq.processedAt && <p>Processed on: {formatDate(returnReq.processedAt)}</p>}</div>
                                            {returnReq.adminNotes && <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200"><p className="text-sm font-medium text-yellow-800 mb-1">Admin Notes:</p><p className="text-sm text-yellow-700">{returnReq.adminNotes}</p></div>}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Link href={`/account/orders/${returnReq.order.id}`}><Button variant="outline" size="sm" className="w-full"><DynamicIcon name="Eye" className="h-4 w-4 mr-2" />View Order</Button></Link>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {pagination.pages > 1 && (
                                <div className="flex items-center justify-center gap-4 mt-6">
                                    <Button variant="outline" onClick={() => changePage(page - 1)} disabled={page === 1}>Previous</Button>
                                    <span className="text-sm">Page {page} of {pagination.pages}</span>
                                    <Button variant="outline" onClick={() => changePage(page + 1)} disabled={page === pagination.pages}>Next</Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ClientOnly>
        </ProtectedRoute>
    );
}
