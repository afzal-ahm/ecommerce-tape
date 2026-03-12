import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  RotateCcw,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Settings,
  User,
  ShoppingBag,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface ReturnRequest {
  id: string;
  orderId: string;
  orderItemId: string;
  userId: string;
  reason: string;
  customReason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING" | "COMPLETED";
  images: string[];
  adminNotes?: string;
  processedAt?: string;
  processedBy?: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
  };
  orderItem: {
    id: string;
    product: {
      id: string;
      name: string;
      slug: string;
      images?: Array<{ url: string }>;
    };
    variant: {
      color?: { name: string; hexCode?: string };
      size?: { name: string };
    };
    price: string;
    quantity: number;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

interface ReturnSettings {
  id: string;
  isEnabled: boolean;
  returnWindowDays: number;
  updatedAt: string;
}

export default function ReturnRequestsPage() {
  const { t } = useLanguage();
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [settings, setSettings] = useState<ReturnSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: "",
    adminNotes: "",
  });

  useEffect(() => {
    fetchReturnRequests();
    fetchSettings();
  }, [page, statusFilter]);

  const fetchReturnRequests = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get("/api/admin/returns", { params });
      if (response.data.success) {
        setReturnRequests(response.data.data.returnRequests || []);
        setTotalPages(response.data.data.pagination?.pages || 1);
      }
    } catch (error: any) {
      console.error("Error fetching return requests:", error);
      toast.error(error.response?.data?.message || t('return_requests.list.load_error') || "Failed to load return requests");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setIsSettingsLoading(true);
      const response = await api.get("/api/admin/returns/settings");
      if (response.data.success) {
        setSettings(response.data.data.settings);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const updateSettings = async () => {
    if (!settings) return;

    // Validate returnWindowDays
    if (!settings.returnWindowDays || settings.returnWindowDays < 1 || settings.returnWindowDays > 30) {
      toast.error(t('return_requests.settings.validation_error') || "Return window must be between 1 and 30 days");
      return;
    }

    try {
      setIsSettingsLoading(true);
      const response = await api.patch("/api/admin/returns/settings", {
        isEnabled: settings.isEnabled,
        returnWindowDays: settings.returnWindowDays,
      });
      if (response.data.success) {
        setSettings(response.data.data.settings);
        setShowSettingsDialog(false);
        toast.success(t('return_requests.settings.save_success') || "Settings updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast.error(error.response?.data?.message || t('return_requests.settings.save_error') || "Failed to update settings");
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const updateReturnStatus = async () => {
    if (!selectedReturn || !statusForm.status) return;

    try {
      const response = await api.patch(
        `/api/admin/returns/${selectedReturn.id}`,
        {
          status: statusForm.status,
          adminNotes: statusForm.adminNotes || undefined,
        }
      );
      if (response.data.success) {
        toast.success(t('return_requests.actions.update_success') || "Return request updated successfully");
        setShowStatusDialog(false);
        setStatusForm({ status: "", adminNotes: "" });
        fetchReturnRequests();
      }
    } catch (error: any) {
      console.error("Error updating return status:", error);
      toast.error(error.response?.data?.message || t('return_requests.actions.update_error') || "Failed to update return request");
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchReturnRequests();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs font-medium">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('return_requests.status.approved')}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2] text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1" />
            {t('return_requests.status.rejected')}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7] text-xs font-medium">
            <Clock className="h-3 w-3 mr-1" />
            {t('return_requests.status.pending')}
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-[#EFF6FF] text-[#3B82F6] border-[#DBEAFE] text-xs font-medium">
            <Package className="h-3 w-3 mr-1" />
            {t('return_requests.status.processing')}
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-[#F3E8FF] text-[#A855F7] border-[#E9D5FF] text-xs font-medium">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('return_requests.status.completed') || "Completed"}
          </Badge>
        );
      default:
        return <Badge className="text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = returnRequests.filter((r) => r.status === "PENDING").length;
  const approvedCount = returnRequests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = returnRequests.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t('return_requests.title')}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t('return_requests.description')}
            </p>
          </div>
          <Button
            variant="outline"
            className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
            onClick={() => setShowSettingsDialog(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('return_requests.dialogs.settings_title')}
          </Button>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Settings Card */}
      {settings && (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('return_requests.dialogs.enable_label')}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-xs font-medium",
                        settings.isEnabled
                          ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5]"
                          : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]"
                      )}
                    >
                      {settings.isEnabled ? t('return_requests.common.enabled') || "Enabled" : t('return_requests.common.disabled') || "Disabled"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('return_requests.dialogs.window_label')}</p>
                  <p className="text-lg font-semibold text-[#1F2937]">
                    {t('return_requests.common.days', { count: settings.returnWindowDays }) || "days"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Bar */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                placeholder={t('return_requests.filters.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <select
              className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-[#F3F7F6] text-sm text-[#4B5563] focus:border-primary focus:outline-none"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('return_requests.filters.all_status')}</option>
              <option value="PENDING">{t('return_requests.status.pending')}</option>
              <option value="APPROVED">{t('return_requests.status.approved')}</option>
              <option value="REJECTED">{t('return_requests.status.rejected')}</option>
              <option value="PROCESSING">{t('return_requests.status.processing')}</option>
              <option value="COMPLETED">{t('return_requests.status.completed') || "Completed"}</option>
            </select>
            <Button
              onClick={handleSearch}
              className=""
            >
              <Search className="h-4 w-4 mr-2" />
              {t('return_requests.filters.search_btn')}
            </Button>
            {(search || statusFilter) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="text-[#4B5563] hover:text-[#1F2937]"
              >
                {t('return_requests.filters.clear')}
              </Button>
            )}
          </div>

          {/* Quick Status Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { status: "PENDING", count: pendingCount, label: t('return_requests.status.pending') },
              { status: "APPROVED", count: approvedCount, label: t('return_requests.status.approved') },
              { status: "REJECTED", count: rejectedCount, label: t('return_requests.status.rejected') },
            ].map(({ status, count, label }) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 text-xs",
                  statusFilter === status
                    ? ""
                    : "border-[#E5E7EB] hover:bg-[#F3F7F6]"
                )}
                onClick={() =>
                  setStatusFilter(statusFilter === status ? "" : status)
                }
              >
                {label} ({count})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Return Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
            <p className="mt-4 text-base text-[#9CA3AF]">{t('partners_tab.common.loading').replace('Partner', 'Return requests').replace('partners', 'Return requests').replace('partner', 'return request')}</p>
          </div>
        </div>
      ) : returnRequests.length === 0 ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
              <RotateCcw className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
              {t('return_requests.list.no_requests')}
            </h3>
            <p className="text-sm text-[#9CA3AF]">
              {search || statusFilter
                ? t('return_requests.list.try_adjusting')
                : t('return_requests.list.empty_desc')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {returnRequests.map((returnReq) => (
            <Card
              key={returnReq.id}
              className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F5E9]">
                            <ShoppingBag className="h-5 w-5 text-[#2E7D32]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#1F2937]">
                              {t('return_requests.list.order')} #{returnReq.order.orderNumber}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" />
                              <span className="text-xs text-[#9CA3AF]">
                                {formatDate(returnReq.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(returnReq.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Customer Details */}
                      <div className="p-4 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-[#4CAF50]" />
                          <p className="text-sm font-medium text-[#4B5563]">{t('return_requests.details.customer')}</p>
                        </div>
                        <div className="space-y-1">
                          <div>
                            <p className="text-xs text-[#9CA3AF] mb-0.5">{t('return_requests.common.name')}</p>
                            <p className="font-semibold text-[#1F2937]">{returnReq.user.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#9CA3AF] mb-0.5">{t('return_requests.common.email')}</p>
                            <p className="text-sm text-[#1F2937]">{returnReq.user.email}</p>
                          </div>
                          {returnReq.user.phone && (
                            <div>
                              <p className="text-xs text-[#9CA3AF] mb-0.5">{t('return_requests.common.number')}</p>
                              <p className="text-sm text-[#1F2937]">{returnReq.user.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="p-4 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-[#4CAF50]" />
                          <p className="text-sm font-medium text-[#4B5563]">{t('return_requests.details.product')}</p>
                        </div>
                        <p className="font-semibold text-[#1F2937]">
                          {returnReq.orderItem.product.name}
                        </p>
                        <p className="text-sm text-[#9CA3AF]">
                          {t('orders.details.qty')}: {returnReq.orderItem.quantity}
                        </p>
                        <p className="text-sm text-[#9CA3AF]">
                          {t('orders.details.price')}: {formatCurrency(parseFloat(returnReq.orderItem.price))}
                        </p>
                      </div>
                    </div>

                    {/* Return Reason */}
                    <div className="p-4 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                      <p className="text-sm font-medium text-[#4B5563] mb-2">{t('return_requests.details.reason')}</p>
                      <p className="font-medium text-[#1F2937]">{returnReq.reason}</p>
                      {returnReq.customReason && (
                        <p className="text-sm text-[#9CA3AF] mt-1">
                          {returnReq.customReason}
                        </p>
                      )}
                    </div>

                    {returnReq.adminNotes && (
                      <div className="p-4 bg-[#FFFBEB] rounded-lg border border-[#FEF3C7]">
                        <p className="text-sm font-medium text-[#F59E0B] mb-1">{t('return_requests.details.admin_notes')}</p>
                        <p className="text-sm text-[#4B5563]">{returnReq.adminNotes}</p>
                      </div>
                    )}

                    {returnReq.processedAt && (
                      <p className="text-xs text-[#9CA3AF]">
                        {t('return_requests.details.processed_on')}: {formatDate(returnReq.processedAt)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 lg:flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
                      onClick={() => {
                        setSelectedReturn(returnReq);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('return_requests.actions.view_details')}
                    </Button>
                    {returnReq.status === "PENDING" && (
                      <Button
                        size="sm"
                        className=""
                        onClick={() => {
                          setSelectedReturn(returnReq);
                          setStatusForm({
                            status: returnReq.status,
                            adminNotes: returnReq.adminNotes || "",
                          });
                          setShowStatusDialog(true);
                        }}
                      >
                        {t('return_requests.actions.update_status')}
                      </Button>
                    )}
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
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {t('return_requests.dialogs.settings_title')}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {t('return_requests.dialogs.settings_desc')}
            </DialogDescription>
          </DialogHeader>
          {settings && (
            <div className="space-y-5 py-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-[#4B5563]">
                    {t('return_requests.dialogs.enable_label')}
                  </Label>
                  <p className="text-xs text-[#9CA3AF]">
                    {t('return_requests.dialogs.enable_desc')}
                  </p>
                </div>
                <Switch
                  checked={settings.isEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, isEnabled: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#4B5563]">
                  {t('return_requests.dialogs.window_label')}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.returnWindowDays}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setSettings({
                        ...settings,
                        returnWindowDays: 0,
                      });
                    } else {
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue >= 1 && numValue <= 30) {
                        setSettings({
                          ...settings,
                          returnWindowDays: numValue,
                        });
                      }
                    }
                  }}
                  className="border-[#E5E7EB] focus:border-primary"
                />
                <p className="text-xs text-[#9CA3AF]">
                  {t('return_requests.dialogs.window_desc')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => setShowSettingsDialog(false)}
            >
              {t('return_requests.settings.cancel')}
            </Button>
            <Button
              className=""
              onClick={updateSettings}
              disabled={isSettingsLoading}
            >
              {isSettingsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                t('return_requests.settings.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {t('return_requests.settings.update_title') || "Update Return Status"}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Update the status of this return request
            </DialogDescription>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#4B5563]">
                  {t('return_requests.status_label')} <span className="text-[#EF4444]">*</span>
                </Label>
                <select
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#4B5563] focus:border-primary focus:outline-none bg-[#F3F7F6]"
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, status: e.target.value })
                  }
                  required
                >
                  <option value="PENDING">{t('return_requests.status.pending')}</option>
                  <option value="APPROVED">{t('return_requests.status.approved')}</option>
                  <option value="REJECTED">{t('return_requests.status.rejected')}</option>
                  <option value="PROCESSING">{t('return_requests.status.processing')}</option>
                  <option value="COMPLETED">{t('return_requests.status.completed') || "Completed"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#4B5563]">
                  {t('return_requests.details.admin_notes')} ({t('partners_tab.common.optional') || "Optional"})
                </Label>
                <Textarea
                  value={statusForm.adminNotes}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, adminNotes: e.target.value })
                  }
                  rows={3}
                  placeholder={t('return_requests.details.admin_notes_placeholder') || "Add notes..."}
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => {
                setShowStatusDialog(false);
                setStatusForm({ status: "", adminNotes: "" });
              }}
            >
              {t('return_requests.settings.cancel')}
            </Button>
            <Button
              className=""
              onClick={updateReturnStatus}
            >
              {t('return_requests.actions.update_status')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {t('return_requests.title')} {t('return_requests.actions.view_details')}
            </DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('return_requests.list.order')}</p>
                  <p className="font-semibold text-[#1F2937]">
                    #{selectedReturn.order.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('return_requests.status_label')}</p>
                  {getStatusBadge(selectedReturn.status)}
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t('return_requests.details.requested_on') || "Requested On"}</p>
                  <p className="text-sm text-[#1F2937]">
                    {formatDate(selectedReturn.createdAt)}
                  </p>
                </div>
                {selectedReturn.processedAt && (
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">{t('return_requests.details.processed_on')}</p>
                    <p className="text-sm text-[#1F2937]">
                      {formatDate(selectedReturn.processedAt)}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#4B5563] mb-2">{t('return_requests.details.customer')}</p>
                <div className="space-y-1">
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-0.5">{t('return_requests.common.name')}</p>
                    <p className="font-semibold text-[#1F2937]">{selectedReturn.user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-0.5">{t('return_requests.common.email')}</p>
                    <p className="text-sm text-[#1F2937]">{selectedReturn.user.email}</p>
                  </div>
                  {selectedReturn.user.phone && (
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-0.5">{t('return_requests.common.number')}</p>
                      <p className="text-sm text-[#1F2937]">{selectedReturn.user.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#4B5563] mb-2">{t('return_requests.details.product')}</p>
                <p className="font-semibold text-[#1F2937]">
                  {selectedReturn.orderItem.product.name}
                </p>
                <p className="text-sm text-[#9CA3AF]">
                  {t('orders.details.qty')}: {selectedReturn.orderItem.quantity}
                </p>
                <p className="text-sm text-[#9CA3AF]">
                  {t('orders.details.price')}: {formatCurrency(parseFloat(selectedReturn.orderItem.price))}
                </p>
              </div>

              <div className="p-4 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#4B5563] mb-2">{t('return_requests.details.reason')}</p>
                <p className="font-medium text-[#1F2937]">{selectedReturn.reason}</p>
                {selectedReturn.customReason && (
                  <p className="text-sm text-[#9CA3AF] mt-1">
                    {selectedReturn.customReason}
                  </p>
                )}
              </div>

              {selectedReturn.adminNotes && (
                <div className="p-4 bg-[#FFFBEB] rounded-lg border border-[#FEF3C7]">
                  <p className="text-sm font-medium text-[#F59E0B] mb-1">{t('return_requests.details.admin_notes')}</p>
                  <p className="text-sm text-[#4B5563]">{selectedReturn.adminNotes}</p>
                </div>
              )}

              {selectedReturn.images && selectedReturn.images.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[#4B5563] mb-3">{t('return_requests.details.images')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedReturn.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${t('return_requests.details.return_image')} ${idx + 1}`}
                        className="w-full h-40 object-cover rounded-lg border border-[#E5E7EB]"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => setShowDetailsDialog(false)}
            >
              {t('return_requests.actions.close')}
            </Button>
            {selectedReturn?.status === "PENDING" && (
              <Button
                className=""
                onClick={() => {
                  setShowDetailsDialog(false);
                  setStatusForm({
                    status: selectedReturn.status,
                    adminNotes: selectedReturn.adminNotes || "",
                  });
                  setShowStatusDialog(true);
                  // Fixed: Added parentheses to function call
                }}
              >
                {t('return_requests.actions.update_status')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function formatCurrency(arg0: number): import("react").ReactNode {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(arg0);
}
