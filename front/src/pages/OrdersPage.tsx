import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { orders } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Search,
  Eye,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export default function OrdersPage() {
  const { t } = useLanguage();
  const [ordersList, setOrdersList] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState("");

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const params = {
          page: currentPage,
          limit: 10,
          ...(searchQuery && { search: searchQuery }),
          ...(selectedStatus && { status: selectedStatus }),
        };

        const response = await orders.getOrders(params);

        if (response && response.data && response.data.success) {
          setOrdersList(response.data.data?.orders || []);
          setTotalPages(response.data.data?.pagination?.pages || 1);
        } else {
          setError(response.data?.message || t('orders.actions.load_error'));
        }
      } catch (error: any) {
        console.error("Error fetching orders:", error);
        setError(t('orders.actions.load_error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage, searchQuery, selectedStatus, t]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]";
      case "PROCESSING":
        return "bg-[#EFF6FF] text-[#3B82F6] border-[#DBEAFE]";
      case "SHIPPED":
        return "bg-[#EEF2FF] text-[#6366F1] border-[#E0E7FF]";
      case "DELIVERED":
        return "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5]";
      case "CANCELLED":
        return "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]";
      case "REFUNDED":
        return "bg-[#F3E8FF] text-[#A855F7] border-[#E9D5FF]";
      case "RETURN_APPROVED":
        return "bg-[#FFF7ED] text-[#F97316] border-[#FFEDD5]";
      case "RETURN_COMPLETED":
        return "bg-[#F0FDFA] text-[#14B8A6] border-[#CCFBF1]";
      default:
        return "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return t('orders.status.pending');
      case "PROCESSING": return t('orders.status.processing');
      case "SHIPPED": return t('orders.status.shipped');
      case "DELIVERED": return t('orders.status.delivered');
      case "CANCELLED": return t('orders.status.cancelled');
      case "REFUNDED": return t('orders.status.refunded');
      case "PAID": return t('orders.status.paid');
      case "RETURN_APPROVED": return t('orders.status.return_approved') || "Return Approved";
      case "RETURN_COMPLETED": return t('orders.status.return_completed') || "Return Completed";
      default: return status;
    }
  };


  // Handle delete order
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(t('orders.actions.delete_confirm'))) return;

    try {
      const response = await orders.deleteOrder(orderId);
      if (response && response.data && response.data.success) {
        toast.success(t('orders.actions.delete_success'));
        setOrdersList((prev: any) => prev.filter((o: any) => o.id !== orderId));
      } else {
        toast.error(response.data?.message || t('orders.actions.delete_error'));
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error(t('orders.actions.delete_error'));
    }
  };


  // Loading state
  if (isLoading && ordersList.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">{t('partners_tab.common.loading').replace('Partners', 'orders').replace('partners', 'orders').replace('Partner', 'Orders').replace('partner', 'orders')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && ordersList.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FEF2F2] mb-4">
          <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
        </div>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-1.5">
          {t('reviews.messages.error_title')}
        </h2>
        <p className="text-center text-[#9CA3AF] mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-[#4CAF50] text-[#2E7D32] hover:bg-[#E8F5E9]"
          onClick={() => {
            setError(null);
            setCurrentPage(1);
            setIsLoading(true);
          }}
        >
          {t('reviews.messages.try_again')}
        </Button>
      </div>
    );
  }

  const deliveredCount = ordersList.filter((o: any) => o.status === "DELIVERED").length;
  const pendingCount = ordersList.filter((o: any) => o.status === "PENDING").length;
  const processingCount = ordersList.filter((o: any) => o.status === "PROCESSING").length;
  const shippedCount = ordersList.filter((o: any) => o.status === "SHIPPED").length;

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t('orders.title')}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t('orders.description')}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-2 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-[#4B5563]" />
              <span className="font-semibold text-[#1F2937]">{ordersList.length}</span>
              <span className="text-[#9CA3AF]">{t('orders.summary.total')}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#ECFDF5] px-3 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-[#22C55E]" />
              <span className="font-semibold text-[#22C55E]">{deliveredCount}</span>
              <span className="text-[#22C55E]">{t('orders.summary.delivered')}</span>
            </div>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Filters Bar */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                type="search"
                placeholder={t('orders.filters.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E5E7EB] focus:border-primary"
              />
            </form>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-[#F3F7F6] text-sm text-[#4B5563] focus:border-primary focus:outline-none"
            >
              <option value="">{t('orders.filters.all_status')}</option>
              <option value="PENDING">{t('orders.status.pending')}</option>
              <option value="PROCESSING">{t('orders.status.processing')}</option>
              <option value="SHIPPED">{t('orders.status.shipped')}</option>
              <option value="DELIVERED">{t('orders.status.delivered')}</option>
              <option value="CANCELLED">{t('orders.status.cancelled')}</option>
              <option value="REFUNDED">{t('orders.status.refunded')}</option>
              <option value="RETURN_APPROVED">{t('orders.status.return_approved') || "Return Approved"}</option>
              <option value="RETURN_COMPLETED">{t('orders.status.return_completed') || "Return Completed"}</option>
            </select>
            {(searchQuery || selectedStatus) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("");
                  setCurrentPage(1);
                }}
                className="text-[#4B5563] hover:text-[#1F2937]"
              >
                {t('orders.filters.clear')}
              </Button>
            )}
          </div>

          {/* Quick Status Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { status: "PENDING", count: pendingCount, label: t('orders.status.pending') },
              { status: "PROCESSING", count: processingCount, label: t('orders.status.processing') },
              { status: "SHIPPED", count: shippedCount, label: t('orders.status.shipped') },
              { status: "DELIVERED", count: deliveredCount, label: t('orders.status.delivered') },
            ].map(({ status, count, label }) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 text-xs",
                  selectedStatus === status
                    ? ""
                    : "border-[#E5E7EB] hover:bg-[#F3F7F6]"
                )}
                onClick={() =>
                  setSelectedStatus(selectedStatus === status ? "" : status)
                }
              >
                {label} ({count})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {ordersList.length === 0 ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
              <ShoppingCart className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
              {t('orders.list.no_orders')}
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
              {selectedStatus
                ? t('orders.list.no_orders_status', { status: getStatusLabel(selectedStatus).toLowerCase() })
                : searchQuery
                  ? t('orders.list.try_adjusting')
                  : t('orders.list.empty_desc')}
            </p>
            {(selectedStatus || searchQuery) && (
              <Button
                variant="outline"
                className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
                onClick={() => {
                  setSelectedStatus("");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
              >
                {t('orders.filters.clear')}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordersList.map((order: any) => (
            <Card
              key={order.id}
              className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F5E9]">
                          <ShoppingCart className="h-5 w-5 text-[#2E7D32]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#1F2937]">
                            #{order.orderNumber}
                          </h3>
                          <p className="text-sm text-[#9CA3AF]">
                            {t('orders.list.items_count', { count: order.items?.length || 0 })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-xs font-medium border",
                          getStatusBadgeClass(order.status)
                        )}
                      >
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[#9CA3AF] mb-1">{t('orders.list.customer')}</p>
                        <p className="font-medium text-[#1F2937]">
                          {order.user?.name || "Guest"}
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          {order.user?.email || "No email"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#9CA3AF] mb-1">{t('orders.list.order_date')}</p>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" />
                          <span className="text-[#1F2937]">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                      {order.parcelxWaybill && (
                        <div className="md:col-span-2">
                          <p className="text-[#9CA3AF] mb-1">ParcelX Waybill</p>
                          <div className="flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-[#4CAF50]" />
                            <span className="font-mono text-xs text-[#1F2937] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#DCFCE7]">
                              {order.parcelxWaybill}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total & Actions */}
                  <div className="flex items-center justify-between lg:flex-col lg:items-end gap-4 lg:gap-2">
                    <div className="text-right">
                      <p className="text-sm text-[#9CA3AF] mb-1">{t('orders.list.total_amount')}</p>
                      <p className="text-xl font-bold text-[#1F2937]">
                        {formatCurrency(
                          order.total || order.totalAmount ||
                          (parseFloat(order.subTotal || 0) +
                            parseFloat(order.shippingCost || 0) -
                            parseFloat(order.discount || 0))
                        )}
                      </p>
                      {order.discount && parseFloat(order.discount) > 0 ? (
                        <p className="text-xs text-[#22C55E] mt-1">
                          {t('orders.list.discount', { amount: formatCurrency(parseFloat(order.discount)) })}
                        </p>
                      ) : null}
                      {order.shippingCost && parseFloat(order.shippingCost) > 0 ? (
                        <p className="text-xs text-[#6B7280] mt-1">
                          COD Charge: {formatCurrency(parseFloat(order.shippingCost))}
                        </p>
                      ) : null}
                      {order.couponCode ? (
                        <p className="text-xs text-[#22C55E] mt-1">
                          Coupon: {order.couponCode}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-[#F3F4F6]"
                        asChild
                        title={t('orders.actions.view_details')}
                      >
                        <Link to={`/orders/${order.id}`}>
                          <Eye className="h-4 w-4 text-[#4B5563]" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-[#FEF2F2] group"
                        onClick={() => handleDeleteOrder(order.id)}
                        title={t('orders.actions.delete')}
                      >
                        <Trash2 className="h-4 w-4 text-[#4B5563] group-hover:text-[#EF4444]" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-4">
          <div className="text-sm text-[#9CA3AF]">
            {t("common.pagination", { current: currentPage, total: totalPages })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
