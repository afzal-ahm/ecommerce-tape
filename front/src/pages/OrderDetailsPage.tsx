import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { orders } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Package,
  CreditCard,
  MapPin,
  Clock,
  User,
  Truck,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, debugData, cn } from "@/lib/utils";
import api from "@/api/api";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { getImageUrl } from "@/utils/image";

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  interface OrderDetails {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    subTotal: string | number;
    shippingAmount: number;
    taxAmount: number;
    discount?: string | number;
    codCharge?: string | number;
    createdAt: string;
    updatedAt: string;
    cancelledAt?: string;
    cancelReason?: string;
    cancelledBy?: string;
    userId?: string;
    couponCode?: string;
    shippingAddress: {
      name?: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone?: string;
    };
    user: {
      name: string;
      email: string;
      phone?: string;
    };
    items: OrderItem[];
    updates?: OrderUpdate[];
    paymentGateway?: string;
    paymentMode?: string;
    paymentMethod?: string;
    razorpayPayment?: {
      paymentMethod: string;
      status: string;
      razorpayPaymentId?: string;
      razorpayOrderId?: string;
    };
    coupon?: {
      discountType: string;
      discountValue: number;
      description?: string;
    };
    tracking?: {
      carrier?: string;
      trackingNumber?: string;
      status?: string;
      estimatedDelivery?: string;
      updates?: OrderUpdate[];
    };
    shiprocket?: {
      orderId?: number;
      shipmentId?: number;
      awbCode?: string;
      status?: string;
      courierName?: string;
    };
    parcelx?: {
      waybill?: string;
      status?: string;
      courierName?: string;
      trackingUrl?: string;
    };
    shipping?: {
      provider: string;
      shiprocket?: any;
      parcelx?: any;
    };
    shippingCost?: string | number;
    total?: string | number;

    invoice?: {
      companyName: string;
      companyAddress: string;
      companyGstNumber: string;
      companyEmail: string;
      companyPhone: string;
    };
  }

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    subtotal: number;
    imageUrl?: string;
    product?: {
      title: string;
      name: string;
      images: string[];
      imageUrl?: string;
    };
    variant?: {
      sku: string;
      flavor?: {
        name: string;
      };
      weight?: {
        value: number;
        unit: string;
      };
      images?: Array<{
        url: string;
      }>;
    };
    returnRequest?: {
      id: string;
      status: string;
      reason: string;
      customReason?: string;
      createdAt: string;
      processedAt?: string;
    } | null;
    // Flash sale fields
    flashSaleName?: string;
    flashSaleDiscount?: number;
    originalPrice?: number;
  }

  interface OrderUpdate {
    id: string;
    status: string;
    timestamp: string;
    note?: string;
    location?: string;
    description?: string;
  }

  // Define fetchOrderDetails outside of useEffect so it can be reused
  const fetchOrderDetails = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const response = await orders.getOrderById(id);

      // Use the debug utility
      debugData("Order API Response", response, true);
      debugData("Order Data", response?.data?.data, true);

      if (response?.data?.success && response?.data?.data?.order) {
        //console.log("ORDER DATA", response.data.data.order); // DEBUGGER
        // Fix: Access the order data correctly from response.data.data.order
        setOrderDetails(response.data.data.order);
      } else {
        setError(response?.data?.message || t('orders.actions.load_error'));
      }
    } catch (error: unknown) {
      console.error("Error fetching order details:", error);

      // Handle axios error properly
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number; data?: { message?: string } } };
        debugData("Error Response", axiosError.response, true);
        setError(
          `API Error (${axiosError.response.status}): ${axiosError.response.data?.message || "Unknown error"}`
        );
      } else if (error && typeof error === 'object' && 'request' in error) {
        const requestError = error as { request: unknown };
        debugData("Error Request", requestError.request, true);
        setError("Network error: No response received from server");
      } else if (error instanceof Error) {
        setError(`Error: ${error.message}`);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchOrderDetails();
  }, [id, fetchOrderDetails]);

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return t('orders.details.not_available');
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
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
      case "APPROVED": return "Approved";
      case "REJECTED": return "Rejected";
      default: return status;
    }
  };

  // Status timeline component
  const StatusTimeline = ({ currentStatus }: { currentStatus: string }) => {
    const steps = [
      { key: "PENDING", label: t('orders.status.placed'), icon: ShoppingCart },
      { key: "PROCESSING", label: t('orders.status.processing'), icon: Package },
      { key: "SHIPPED", label: t('orders.status.shipped'), icon: Truck },
      { key: "DELIVERED", label: t('orders.status.delivered'), icon: CheckCircle },
    ];

    // Handle cancelled or refunded orders
    if (currentStatus === "CANCELLED" || currentStatus === "REFUNDED") {
      return (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FEF2F2] text-[#EF4444] rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-[#EF4444]">{getStatusLabel(currentStatus)}</p>
              <p className="text-sm text-[#9CA3AF]">
                {currentStatus === "CANCELLED" ? t('orders.status.cancelled') : t('orders.status.refunded')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    const currentStepIndex = steps.findIndex(step => step.key === currentStatus);

    return (
      <div className="w-full py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const IconComponent = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div className={cn(
                      "flex-1 h-0.5",
                      isCompleted ? 'bg-[#22C55E]' : 'bg-[#E5E7EB]'
                    )} />
                  )}

                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mx-2",
                    isCompleted
                      ? 'bg-[#22C55E] text-white'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-[#F3F4F6] text-[#9CA3AF]'
                  )}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {index < steps.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5",
                      index < currentStepIndex ? 'bg-[#22C55E]' : 'bg-[#E5E7EB]'
                    )} />
                  )}
                </div>

                <div className="mt-3 text-center">
                  <p className={cn(
                    "text-xs font-medium",
                    isCompleted
                      ? 'text-[#22C55E]'
                      : isCurrent
                        ? 'text-[#4CAF50]'
                        : 'text-[#9CA3AF]'
                  )}>
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
      case "APPROVED":
        return "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5]";
      case "REJECTED":
        return "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]";
      default:
        return "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]";
    }
  };

  // ParcelX sync modal state
const [showParcelXModal, setShowParcelXModal] = useState(false);
const [parcelXForm, setParcelXForm] = useState({
  length: "10",
  width: "10",
  height: "10",
  weight: "0.5",
  type: "priority",
  courierCode: "PXBDE01",
});

const COURIER_OPTIONS = [
  { label: "Delhivery", value: "PXDEL01" },
  { label: "Amazon", value: "PXA01" },
  { label: "Bluedart", value: "PXBDE01" },
  { label: "XPressBees", value: "PXXBS02" },
  { label: "Ekart", value: "PXEK02" },
  { label: "Ekart B2B", value: "PXEKB2B10" },
  { label: "Delhivery B2B 6CFT", value: "PXDLB2B01" },
];

  const handleSyncToParcelX = async () => {
  if (!id) return;
  try {
    setIsLoading(true);
    setShowParcelXModal(false);
    const response = await api.post(`/api/admin/parcelx/orders/${id}/sync`, {
      length: parseFloat(parcelXForm.length),
      width: parseFloat(parcelXForm.width),
      height: parseFloat(parcelXForm.height),
      weight: parseFloat(parcelXForm.weight),
      courierType: parcelXForm.type === "priority" ? 0 : 1,
      courierCode: parcelXForm.type === "priority" ? "" : parcelXForm.courierCode,
    });
    if (response.data.success) {
      toast.success("Order synced to ParcelX successfully");
      fetchOrderDetails();
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Failed to sync to ParcelX");
  } finally {
    setIsLoading(false);
  }
};

  // Handle order status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;

    try {
      const response = await orders.updateOrderStatus(id, {
        status: newStatus,
      });

      if (response && response.data && response.data.success) {
        toast.success(t('orders.actions.status_update_success', { status: newStatus }));

        // Update the order status in the UI
        setOrderDetails((prev: OrderDetails | null) => ({
          ...prev!,
          status: newStatus,
        }));
      } else {
        toast.error(response.data?.message || t('orders.actions.status_update_error'));
      }
    } catch (error: unknown) {
      console.error("Error updating order status:", error);
      toast.error(t('orders.actions.status_update_error'));
    }
  };



  // Loading state
  if (isLoading && !orderDetails) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">
            {t('partners_tab.common.loading').replace('Partners', 'Order details').replace('partners', 'order details').replace('Partner', 'Order').replace('partner', 'order')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !orderDetails) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FEF2F2] mb-4">
          <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
        </div>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-1.5">{t('reviews.messages.error_title')}</h2>
        <p className="text-center text-[#9CA3AF] mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-[#4CAF50] text-[#2E7D32] hover:bg-[#E8F5E9]"
          onClick={() => {
            setError(null);
            setIsLoading(true);
            fetchOrderDetails();
          }}
        >
          {t('reviews.messages.try_again')}
        </Button>
      </div>
    );
  }

  // No order or empty order data, but not in error state
  if (
    !isLoading &&
    !error &&
    (!orderDetails || Object.keys(orderDetails).length === 0)
  ) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild className="mb-2">
          <Link to="/orders">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('orders.details.back_to_list')}
          </Link>
        </Button>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t('orders.details.not_found')}
            </h2>
            <p className="text-center text-muted-foreground mb-4">
              {t('orders.details.not_found_desc')}
            </p>
            <Button
              onClick={() => {
                setIsLoading(true);
                fetchOrderDetails();
              }}
            >
              {t('reviews.messages.try_again')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fix access to order items (may need to adjust based on actual API response structure)
  // Early return if orderDetails is null
  if (!orderDetails) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <>
            <AlertTriangle className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">{t('orders.details.not_found')}</h2>
            <p className="text-center text-muted-foreground">
              {t('orders.details.not_found_desc')}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              asChild
            >
              <Link to="/orders">{t('orders.details.back_to_list')}</Link>
            </Button>
          </>
        </div>
      </div>
    );
  }

  const orderItems = orderDetails.items || [];

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="mb-3 border-[#E5E7EB] hover:bg-[#F3F7F6]"
            >
              <Link to="/orders">
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('orders.details.back_to_list')}
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t('orders.details.title', { number: orderDetails.orderNumber })}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t('orders.details.placed_on', { date: formatDate(orderDetails.createdAt) })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge
              className={cn(
                "text-xs font-medium border px-3 py-1",
                getStatusBadgeClass(orderDetails.status)
              )}
            >
              {getStatusLabel(orderDetails.status)}
            </Badge>

            {/* Status update buttons */}
            {orderDetails.status !== "DELIVERED" &&
              orderDetails.status !== "CANCELLED" &&
              orderDetails.status !== "REFUNDED" && (
                <div className="flex flex-wrap gap-2">
                  {orderDetails.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
                      onClick={() => handleStatusUpdate("PROCESSING")}
                    >
                      {t('orders.actions.mark_processing')}
                    </Button>
                  )}

                  {(orderDetails.status === "PROCESSING" ||
                    orderDetails.status === "PAID") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
                        onClick={() => handleStatusUpdate("SHIPPED")}
                      >
                        {t('orders.actions.mark_shipped')}
                      </Button>
                    )}

                  {orderDetails.status === "SHIPPED" && (
                    <Button
                      size="sm"
                      className=""
                      onClick={() => handleStatusUpdate("DELIVERED")}
                    >
                      {t('orders.actions.mark_delivered')}
                    </Button>
                  )}

                  {(orderDetails.status === "PENDING" ||
                    orderDetails.status === "PROCESSING") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
                        onClick={() => handleStatusUpdate("PAID")}
                      >
                        {t('orders.actions.mark_paid')}
                      </Button>
                    )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2]"
                    onClick={() => handleStatusUpdate("CANCELLED")}
                  >
                    {t('orders.actions.cancel')}
                  </Button>
                </div>
              )}
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Status Timeline */}
        <div className="lg:col-span-3">
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                <Truck className="mr-2 h-5 w-5 text-[#4CAF50]" />
                {t('orders.details.status_timeline')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <StatusTimeline currentStatus={orderDetails.status} />
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                <Package className="mr-2 h-5 w-5 text-[#4CAF50]" />
                {t('orders.details.items')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="divide-y divide-[#E5E7EB]">
                {orderItems.map((item: OrderItem) => (
                  <div key={item.id} className="py-4 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-lg bg-white border border-[#E5E7EB] overflow-hidden flex-shrink-0">
                      <img
                        src={getImageUrl(
                          item.imageUrl ||
                          item.product?.imageUrl ||
                          (Array.isArray(item.product?.images) ? item.product.images[0] : null) ||
                          (item.variant?.images?.[0]?.url) ||
                          null
                        )}
                        alt={item.product?.name || "Product"}
                        className="h-full w-full object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.src =
                            "/images/product-placeholder.jpg";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1F2937] mb-1">
                        {item.product?.name}
                      </p>
                      <p className="text-xs text-[#9CA3AF] mb-2">
                        {t('orders.details.sku')}: {item.variant?.sku || t('orders.details.not_available')}
                      </p>
                      {item.variant?.flavor && (
                        <div className="text-sm text-[#4B5563]">
                          <span className="text-[#9CA3AF]">{t('orders.details.flavor')}: </span>
                          {item.variant.flavor.name}
                          {item.variant.weight && (
                            <>
                              <span className="text-[#9CA3AF] ml-2">{t('orders.details.weight')}: </span>
                              {`${item.variant.weight.value}${item.variant.weight.unit}`}
                            </>
                          )}
                        </div>
                      )}

                      {/* Flash Sale Badge */}
                      {item.flashSaleName && (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] px-2 py-0 h-5 font-normal">
                            ⚡ {item.flashSaleName}
                          </Badge>
                          <span className="text-xs text-orange-600 font-medium">-{item.flashSaleDiscount}% OFF</span>
                        </div>
                      )}
                      {/* Return Request Badge */}
                      {item.returnRequest && (
                        <div className="mt-2">
                          <Badge
                            className={cn(
                              "text-xs font-medium border",
                              getStatusBadgeClass(item.returnRequest.status)
                            )}
                          >
                            Return: {getStatusLabel(item.returnRequest.status)}
                          </Badge>
                          <p className="text-xs text-[#9CA3AF] mt-1">
                            Reason: {item.returnRequest.reason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-[#9CA3AF] mb-1">{t('orders.details.price')}</p>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <p className="text-xs text-[#9CA3AF] line-through">
                          {formatCurrency(item.originalPrice)}
                        </p>
                      )}
                      <p className="font-semibold text-[#1F2937] mb-3">
                        {formatCurrency(item.price)}
                      </p>
                      <p className="text-sm text-[#9CA3AF] mb-1">{t('orders.details.qty')}</p>
                      <p className="font-semibold text-[#1F2937] mb-3">
                        {item.quantity}
                      </p>
                      <p className="text-sm text-[#9CA3AF] mb-1">{t('orders.details.total')}</p>
                      <p className="font-bold text-lg text-[#1F2937]">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                <User className="mr-2 h-5 w-5 text-[#4CAF50]" />
                {t('orders.details.customer_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('return_requests.common.name')}</p>
                  <p className="font-medium text-[#1F2937]">
                    {orderDetails.user?.name || "Guest"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('return_requests.common.email')}</p>
                  <p className="font-medium text-[#1F2937]">
                    {orderDetails.user?.email || t('orders.details.not_available')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('partners_tab.common.number')}</p>
                  <p className="font-medium text-[#1F2937]">
                    {orderDetails.user?.phone || t('orders.details.not_available')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Information (if order is cancelled) */}
          {orderDetails.status === "CANCELLED" && (
            <Card className="bg-[#FEF2F2] border-2 border-[#FEE2E2] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-[#EF4444] flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  {t('orders.details.cancellation_info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">{t('orders.details.cancelled_at')}</p>
                    <p className="font-medium text-[#1F2937]">
                      {orderDetails.cancelledAt && formatDate(orderDetails.cancelledAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">{t('orders.details.reason')}</p>
                    <p className="font-medium text-[#1F2937]">
                      {orderDetails.cancelReason || t('orders.details.no_reason')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">{t('orders.details.cancelled_by')}</p>
                    <p className="font-medium text-[#1F2937]">
                      {orderDetails.cancelledBy === orderDetails.userId
                        ? t('orders.details.by_customer')
                        : t('orders.details.by_admin')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                <CreditCard className="mr-2 h-5 w-5 text-[#4CAF50]" />
                {t('orders.details.payment_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('orders.details.method')}</p>
                  <p className="font-medium text-[#1F2937]">
                    {orderDetails.paymentMethod || orderDetails.razorpayPayment?.paymentMethod || "ONLINE"}
                  </p>
                </div>
                {orderDetails.paymentGateway && (
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">{t('orders.details.gateway')}</p>
                    <p className="font-medium text-[#1F2937]">
                      {orderDetails.paymentGateway}
                      {orderDetails.paymentMode && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({orderDetails.paymentMode})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('partners_tab.common.status')}</p>
                  <Badge
                    className={cn(
                      "text-xs font-medium border",
                      orderDetails.razorpayPayment?.status === "CAPTURED" ||
                        orderDetails.razorpayPayment?.status === "PAID" ||
                        orderDetails.status === "PAID"
                        ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5]"
                        : "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]"
                    )}
                  >
                    {orderDetails.razorpayPayment?.status || getStatusLabel(orderDetails.status) || t('orders.details.not_available')}
                  </Badge>
                </div>
                {orderDetails.razorpayPayment?.razorpayPaymentId && (
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">{t('orders.details.transaction_id')}</p>
                    <p className="font-mono text-xs text-[#1F2937] bg-[#F3F4F6] px-2 py-1 rounded border border-[#E5E7EB]">
                      {orderDetails.razorpayPayment.razorpayPaymentId}
                    </p>
                  </div>
                )}
                {orderDetails.razorpayPayment?.razorpayOrderId && (
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">{t('orders.details.order_id')}</p>
                    <p className="font-mono text-xs text-[#1F2937] bg-[#F3F4F6] px-2 py-1 rounded border border-[#E5E7EB]">
                      {orderDetails.razorpayPayment.razorpayOrderId}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-[#4CAF50]" />
                {t('orders.details.shipping_address')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {orderDetails.shippingAddress ? (
                <div className="space-y-2">
                  <p className="font-semibold text-[#1F2937]">
                    {orderDetails.shippingAddress.name}
                  </p>
                  <p className="text-[#4B5563]">{orderDetails.shippingAddress.street}</p>
                  <p className="text-[#4B5563]">
                    {orderDetails.shippingAddress.city},{" "}
                    {orderDetails.shippingAddress.state}{" "}
                    {orderDetails.shippingAddress.postalCode}
                  </p>
                  <p className="text-[#4B5563]">{orderDetails.shippingAddress.country}</p>
                  <p className="text-sm text-[#9CA3AF]">
                    Phone: {orderDetails.shippingAddress.phone || t('orders.details.not_available')}
                  </p>
                </div>
              ) : (
                <p className="text-[#9CA3AF]">No shipping address found</p>
              )}
            </CardContent>
          </Card>

          {orderDetails.invoice && (
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-[#1F2937]">
                  Company Invoice
                </CardTitle>
              </CardHeader>

              <CardContent className="px-6 pb-6 space-y-3">

                <div>
                  <p className="text-xs text-[#9CA3AF]">Company Name</p>
                  <p className="font-medium">{orderDetails.invoice.companyName}</p>
                </div>

                <div>
                  <p className="text-xs text-[#9CA3AF]">Company Address</p>
                  <p className="font-medium">{orderDetails.invoice.companyAddress}</p>
                </div>

                <div>
                  <p className="text-xs text-[#9CA3AF]">GST Number</p>
                  <p className="font-medium">{orderDetails.invoice.companyGstNumber}</p>
                </div>

                <div>
                  <p className="text-xs text-[#9CA3AF]">Company Email</p>
                  <p className="font-medium">{orderDetails.invoice.companyEmail}</p>
                </div>

                <div>
                  <p className="text-xs text-[#9CA3AF]">Company Phone</p>
                  <p className="font-medium">{orderDetails.invoice.companyPhone}</p>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Order Summary */}
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5 text-[#4CAF50]" />
                {t('orders.details.total')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#4B5563]">{t('orders.details.subtotal')}:</span>
                  <span className="font-medium text-[#1F2937]">
                    {formatCurrency(orderDetails.subTotal)}
                  </span>
                </div>
                {/* <div className="flex justify-between text-sm">       UNCOMMENT THIS TO REMOVE TAX
                  <span className="text-[#4B5563]">{t('orders.details.tax')} (0%):</span>
                  <span className="font-medium text-[#1F2937]">
                    {formatCurrency(0)}
                  </span>
                </div> */}
                <div className="flex justify-between text-sm">
                  <span className="text-[#4B5563]">GST (18%):</span>
                  <span className="font-medium text-[#1F2937]">
                    {formatCurrency(
                      (typeof orderDetails.subTotal === "string"
                        ? parseFloat(orderDetails.subTotal)
                        : orderDetails.subTotal) * 0.18
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#4B5563]">{t('orders.details.shipping')}:</span>
                  <span className="font-medium text-[#1F2937]">
                    {formatCurrency(
                      typeof orderDetails.shippingCost === 'string'
                        ? parseFloat(orderDetails.shippingCost)
                        : (orderDetails.shippingCost || 0)
                    )}
                  </span>
                </div>
                {(typeof orderDetails.codCharge === 'string' ? parseFloat(orderDetails.codCharge) : (orderDetails.codCharge || 0)) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4B5563]">COD Surcharge:</span>
                    <span className="font-medium text-[#1F2937]">
                      {formatCurrency(
                        typeof orderDetails.codCharge === 'string'
                          ? parseFloat(orderDetails.codCharge)
                          : (orderDetails.codCharge || 0)
                      )}
                    </span>
                  </div>
                )}
                {(typeof orderDetails.discount === 'string' ? parseFloat(orderDetails.discount) : (orderDetails.discount || 0)) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#22C55E]">Discount:</span>
                    <span className="font-medium text-[#22C55E]">
                      -{formatCurrency(
                        typeof orderDetails.discount === 'string'
                          ? parseFloat(orderDetails.discount)
                          : (orderDetails.discount || 0)
                      )}
                    </span>
                  </div>
                )}
                {orderDetails.couponCode && (
                  <div className="mt-2 p-3 bg-[#ECFDF5] border border-[#D1FAE5] rounded-lg">
                    <div className="flex items-center text-[#22C55E] font-medium mb-1 text-sm">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Coupon applied: {orderDetails.couponCode}
                    </div>
                    {orderDetails.coupon && (
                      <div className="text-sm text-[#22C55E]">
                        {orderDetails.coupon.discountType === "PERCENTAGE" ? (
                          <span>
                            {orderDetails.coupon.discountValue}% off the order total
                          </span>
                        ) : (
                          <span>
                            {formatCurrency(orderDetails.coupon.discountValue)} off the order total
                          </span>
                        )}
                        {orderDetails.coupon.description && (
                          <p className="text-xs mt-1 text-[#9CA3AF]">
                            {orderDetails.coupon.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between border-t border-[#E5E7EB] pt-3 font-bold text-lg">
                  <span className="text-[#1F2937]">{t('orders.details.grand_total')}:</span>
                  <span className="text-[#1F2937]">
                    {/* {formatCurrency(   UNCOMMENT THIS TO REMOVE THE TAX
                      orderDetails.total ||
                      ((typeof orderDetails.subTotal === 'string' ? parseFloat(orderDetails.subTotal) : orderDetails.subTotal) +
                        (typeof orderDetails.shippingCost === 'string' ? parseFloat(orderDetails.shippingCost) : (orderDetails.shippingCost || 0)) +
                        (typeof orderDetails.codCharge === 'string' ? parseFloat(orderDetails.codCharge) : (orderDetails.codCharge || 0)) -
                        (typeof orderDetails.discount === 'string' ? parseFloat(orderDetails.discount) : (orderDetails.discount || 0)))
                    )} */}
                    {formatCurrency(
                      orderDetails.total ||
                      ((typeof orderDetails.subTotal === 'string' ? parseFloat(orderDetails.subTotal) : orderDetails.subTotal) +
                        ((typeof orderDetails.subTotal === 'string' ? parseFloat(orderDetails.subTotal) : orderDetails.subTotal) * 0.18) +
                        (typeof orderDetails.shippingCost === 'string' ? parseFloat(orderDetails.shippingCost) : (orderDetails.shippingCost || 0)) +
                        (typeof orderDetails.codCharge === 'string' ? parseFloat(orderDetails.codCharge) : (orderDetails.codCharge || 0)) -
                        (typeof orderDetails.discount === 'string' ? parseFloat(orderDetails.discount) : (orderDetails.discount || 0)))
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Tracking Info */}
          {orderDetails.status === "SHIPPED" ||
            orderDetails.status === "DELIVERED" ? (
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                  <Truck className="mr-2 h-5 w-5 text-[#4CAF50]" />
                  Tracking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {orderDetails.tracking ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">Carrier</p>
                      <p className="font-medium text-[#1F2937]">
                        {orderDetails.tracking.carrier || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">Tracking Number</p>
                      <p className="font-mono text-sm text-[#1F2937] bg-[#F3F4F6] px-2 py-1 rounded border border-[#E5E7EB]">
                        {orderDetails.tracking.trackingNumber || t('orders.details.not_available')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">{t('partners_tab.common.status')}</p>
                      <Badge
                        className={cn(
                          "text-xs font-medium border",
                          getStatusBadgeClass(
                            orderDetails.tracking?.status || orderDetails.status
                          )
                        )}
                      >
                        {getStatusLabel(orderDetails.tracking?.status || orderDetails.status)}
                      </Badge>
                    </div>
                    {orderDetails.tracking.estimatedDelivery && (
                      <div>
                        <p className="text-xs text-[#9CA3AF] mb-1">Estimated Delivery</p>
                        <p className="font-medium text-[#1F2937]">
                          {formatDate(orderDetails.tracking.estimatedDelivery)}
                        </p>
                      </div>
                    )}

                    {/* Tracking Updates */}
                    {orderDetails.tracking.updates &&
                      orderDetails.tracking.updates.length > 0 && (
                        <div className="mt-6">
                          <h4 className="mb-3 font-semibold text-[#1F2937]">Tracking Updates</h4>
                          <div className="space-y-3">
                            {orderDetails.tracking.updates.map(
                              (update: OrderUpdate, index: number) => (
                                <div
                                  key={index}
                                  className="rounded-lg border border-[#E5E7EB] bg-[#F3F7F6] p-3"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-[#9CA3AF]" />
                                    <span className="text-sm text-[#9CA3AF]">
                                      {formatDate(update.timestamp)}
                                    </span>
                                  </div>
                                  <p className="font-medium text-[#1F2937] mb-1">
                                    {update.status}
                                  </p>
                                  {update.location && (
                                    <p className="text-sm text-[#4B5563]">
                                      {update.location}
                                    </p>
                                  )}
                                  {update.description && (
                                    <p className="text-sm text-[#4B5563] mt-1">
                                      {update.description}
                                    </p>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                      <Truck className="h-8 w-8 text-[#9CA3AF]" />
                    </div>
                    <p className="font-semibold text-[#1F2937] mb-1.5">Shipping in progress</p>
                    <p className="text-sm text-[#9CA3AF] mb-4 max-w-sm mx-auto">
                      {orderDetails.status === "DELIVERED"
                        ? "This order has been marked as delivered, but no detailed tracking information is available."
                        : "This order has been shipped, but detailed tracking information is not yet available."}
                    </p>
                    <Badge
                      className={cn(
                        "text-xs font-medium border",
                        getStatusBadgeClass(orderDetails.status)
                      )}
                    >
                      {getStatusLabel(orderDetails.status)}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* ParcelX Information */}
          {(orderDetails.parcelx || (orderDetails.shipping?.provider === "PARCELX" && orderDetails.shipping?.parcelx)) && (
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                  <Truck className="mr-2 h-5 w-5 text-[#4CAF50]" />
                  ParcelX Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  {(orderDetails.parcelx?.waybill || orderDetails.shipping?.parcelx?.waybill) && (
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">Waybill / Tracking Number</p>
                      <p className="font-mono text-sm text-[#1F2937] bg-[#F3F4F6] px-2 py-1 rounded border border-[#E5E7EB]">
                        {orderDetails.parcelx?.waybill || orderDetails.shipping?.parcelx?.waybill}
                      </p>
                    </div>
                  )}
                  {(orderDetails.parcelx?.status || orderDetails.shipping?.parcelx?.status) && (
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">ParcelX Status</p>
                      <Badge
                        className={cn(
                          "text-xs font-medium border",
                          getStatusBadgeClass(orderDetails.parcelx?.status || orderDetails.shipping?.parcelx?.status)
                        )}
                      >
                        {orderDetails.parcelx?.status || orderDetails.shipping?.parcelx?.status}
                      </Badge>
                    </div>
                  )}
                  {(orderDetails.parcelx?.courierName || orderDetails.shipping?.parcelx?.courierName) && (
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">Courier</p>
                      <p className="font-medium text-[#1F2937]">
                        {orderDetails.parcelx?.courierName || orderDetails.shipping?.parcelx?.courierName}
                      </p>
                    </div>
                  )}
                  {(orderDetails.parcelx?.trackingUrl || orderDetails.shipping?.parcelx?.trackingUrl) && (
                    <div className="pt-2">
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <a href={orderDetails.parcelx?.trackingUrl || orderDetails.shipping?.parcelx?.trackingUrl} target="_blank" rel="noopener noreferrer">
                          Track on ParcelX
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sync Button for ParcelX */}
{orderDetails.status !== "CANCELLED" &&
  orderDetails.status !== "DELIVERED" &&
  !(orderDetails.parcelx?.waybill || orderDetails.shipping?.parcelx?.waybill) && (
    <Card className="bg-[#F0FDF4] border-[#DCFCE7] shadow-sm rounded-xl">
      <CardContent className="p-6 text-center">
        <h3 className="font-semibold text-[#166534] mb-2 text-sm uppercase tracking-wider">ParcelX Fulfillment</h3>
        <p className="text-xs text-[#15803d] mb-4">Sync this order to ParcelX to generate waybill and tracking.</p>
        <Button
          onClick={() => setShowParcelXModal(true)}
          className="bg-[#4CAF50] hover:bg-[#43A047] text-white w-full"
        >
          Sync to ParcelX
        </Button>
      </CardContent>
    </Card>
  )}

{/* ParcelX Sync Modal */}
{showParcelXModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
      <h2 className="text-lg font-bold text-[#1F2937] mb-1">Sync to ParcelX</h2>
      <p className="text-xs text-[#6B7280] mb-5">Set shipment details before syncing.</p>

      {/* Dimensions & Weight */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Length (cm)", key: "length" },
          { label: "Width (cm)", key: "width" },
          { label: "Height (cm)", key: "height" },
          { label: "Weight (kg)", key: "weight" },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="text-xs font-medium text-[#374151] mb-1 block">{label}</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={parcelXForm[key as keyof typeof parcelXForm]}
              onChange={(e) => setParcelXForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            />
          </div>
        ))}
      </div>

      {/* Type Dropdown */}
      <div className="mb-4">
        <label className="text-xs font-medium text-[#374151] mb-1 block">Account Type</label>
        <select
          value={parcelXForm.type}
          onChange={(e) => setParcelXForm((prev) => ({ ...prev, type: e.target.value }))}
          className="w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
        >
          <option value="priority">Priority (Auto Select Courier)</option>
          <option value="normal">Normal (Select Courier)</option>
        </select>
      </div>

      {/* Courier Dropdown — only when Normal */}
      <div className="mb-6">
        <label className="text-xs font-medium text-[#374151] mb-1 block">
          Courier Partner
          {parcelXForm.type === "priority" && (
            <span className="ml-2 text-[#9CA3AF]">(disabled in Priority mode)</span>
          )}
        </label>
        <select
          value={parcelXForm.courierCode}
          onChange={(e) => setParcelXForm((prev) => ({ ...prev, courierCode: e.target.value }))}
          disabled={parcelXForm.type === "priority"}
          className={`w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${
            parcelXForm.type === "priority" ? "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed" : ""
          }`}
        >
          {COURIER_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowParcelXModal(false)}
          className="flex-1 border border-[#E5E7EB] rounded-md py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
        >
          Cancel
        </button>
        <button
          onClick={handleSyncToParcelX}
          disabled={isLoading}
          className="flex-1 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded-md py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isLoading ? "Syncing..." : "Confirm & Sync"}
        </button>
      </div>
    </div>
  </div>
)}

          {/* Shiprocket Information */}
          {orderDetails.shiprocket && (
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                  <Truck className="mr-2 h-5 w-5 text-[#4CAF50]" />
                  Shiprocket Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  {orderDetails.shiprocket.orderId && (
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">Shiprocket Order ID</p>
                      <p className="font-mono text-sm text-[#1F2937] bg-[#F3F4F6] px-2 py-1 rounded border border-[#E5E7EB]">
                        {orderDetails.shiprocket.orderId}
                      </p>
                    </div>
                  )}
                  {orderDetails.shiprocket.shipmentId && (
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">Shipment ID</p>
                      <p className="font-mono text-sm text-[#1F2937] bg-[#F3F4F6] px-2 py-1 rounded border border-[#E5E7EB]">
                        {orderDetails.shiprocket.shipmentId}
                      </p>
                    </div>
                  )}
                  {orderDetails.shiprocket.awbCode && (
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">AWB Code</p>
                      <p className="font-mono text-sm text-[#1F2937] bg-[#F3F4F6] px-2 py-1 rounded border border-[#E5E7EB]">
                        {orderDetails.shiprocket.awbCode}
                      </p>
                    </div>
                  )}
                  {orderDetails.shiprocket.courierName && (
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">Courier</p>
                      <p className="font-medium text-[#1F2937]">
                        {orderDetails.shiprocket.courierName}
                      </p>
                    </div>
                  )}
                  {orderDetails.shiprocket.status && (
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-1">Shiprocket Status</p>
                      <Badge
                        className={cn(
                          "text-xs font-medium border",
                          getStatusBadgeClass(orderDetails.shiprocket.status)
                        )}
                      >
                        {orderDetails.shiprocket.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
