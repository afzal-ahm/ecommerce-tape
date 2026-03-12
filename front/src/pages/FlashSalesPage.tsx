import { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { flashSales, products } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import MultiSelectCombo from "@/components/MultiSelectCombo";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit,
  AlertTriangle,
  Calendar,
  Percent,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context";

interface FlashSaleItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  discountPercentage: number;
  maxQuantity?: number;
  soldCount: number;
  isActive: boolean;
  productCount: number;
  products?: Array<{
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
      slug: string;
      image: string | null;
    };
  }>;
}

export default function FlashSalesPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewFlashSale = location.pathname.includes("/new");
  const isEditFlashSale = !!id;

  return (
    <>
      {isNewFlashSale && <FlashSaleForm mode="create" />}
      {isEditFlashSale && <FlashSaleForm mode="edit" flashSaleId={id} />}
      {!isNewFlashSale && !isEditFlashSale && <FlashSalesList />}
    </>
  );
}

function FlashSalesList() {
  const { t } = useLanguage();
  const [flashSalesList, setFlashSalesList] = useState<FlashSaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await flashSales.getFlashSales();
        if (response.data.success) {
          setFlashSalesList(response.data.data?.flashSales || []);
        } else {
          const errorMsg =
            response.data.message || "Failed to fetch flash sales";
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (error: any) {
        console.error("Error fetching flash sales:", error);
        const errorMsg =
          error.response?.data?.message || t("flash_sales.messages.load_error");
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFlashSales();
  }, []);

  const handleDelete = async (flashSaleId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }
    try {
      const response = await flashSales.deleteFlashSale(flashSaleId);
      if (response.data.success) {
        toast.success(t("flash_sales.messages.delete_success"));
        setFlashSalesList(
          flashSalesList.filter((sale) => sale.id !== flashSaleId)
        );
      } else {
        toast.error(response.data.message || t("flash_sales.messages.delete_error"));
      }
    } catch (error: any) {
      console.error("Error deleting flash sale:", error);
      toast.error(t("flash_sales.messages.delete_error_generic"));
    }
  };

  const handleToggleStatus = async (
    flashSaleId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await flashSales.toggleFlashSaleStatus(flashSaleId);
      if (response.data.success) {
        toast.success(
          !currentStatus ? t("flash_sales.messages.toggle_success_activated") : t("flash_sales.messages.toggle_success_deactivated")
        );
        setFlashSalesList(
          flashSalesList.map((sale) =>
            sale.id === flashSaleId
              ? { ...sale, isActive: !currentStatus }
              : sale
          )
        );
      } else {
        toast.error(response.data.message || t("flash_sales.messages.toggle_error"));
      }
    } catch (error: any) {
      console.error("Error toggling status:", error);
      toast.error(t("flash_sales.messages.toggle_error_generic"));
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

  const getStatus = (sale: FlashSaleItem) => {
    const now = new Date();
    const start = new Date(sale.startTime);
    const end = new Date(sale.endTime);

    if (!sale.isActive) return { text: t("flash_sales.status.inactive"), color: "text-gray-500" };
    if (now < start) return { text: t("flash_sales.status.upcoming"), color: "text-blue-600" };
    if (now >= start && now <= end)
      return { text: t("flash_sales.status.active"), color: "text-green-600" };
    return { text: t("flash_sales.status.ended"), color: "text-red-600" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">{t("flash_sales.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#FEF2F2] border-[#FEE2E2] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[#EF4444] flex-shrink-0" />
          <p className="text-[#DC2626]">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t("flash_sales.title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t("flash_sales.subtitle")}
            </p>
          </div>
          <Button
            asChild

          >
            <Link to="/flash-sales/new">
              <Plus className="h-4 w-4 mr-2" />
              {t("flash_sales.create_button")}
            </Link>
          </Button>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {flashSalesList.length === 0 ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
              <Zap className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
              {t("flash_sales.empty.title")}
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
              {t("flash_sales.empty.description")}
            </p>
            <Button
              asChild

            >
              <Link to="/flash-sales/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("flash_sales.create_button")}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {flashSalesList.map((sale) => {
            const status = getStatus(sale);
            const statusBadgeClass =
              status.text === "Active"
                ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5]"
                : status.text === "Upcoming"
                  ? "bg-[#EFF6FF] text-[#3B82F6] border-[#DBEAFE]"
                  : status.text === "Ended"
                    ? "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]"
                    : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]";
            return (
              <Card
                key={sale.id}
                className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FEF3C7]">
                          <Zap className="h-5 w-5 text-[#F59E0B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-[#1F2937] truncate">
                            {sale.name}
                          </h3>
                        </div>
                      </div>
                      <div className="mb-3">
                        <Badge className={`${statusBadgeClass} text-xs font-medium`}>
                          {status.text}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                      <p className="text-xs text-[#9CA3AF] mb-1">{t("flash_sales.card.discount")}</p>
                      <p className="font-bold text-[#EF4444] text-lg">
                        {sale.discountPercentage}% OFF
                      </p>
                    </div>
                    <div className="p-3 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                      <p className="text-xs text-[#9CA3AF] mb-1">{t("flash_sales.card.products")}</p>
                      <p className="font-bold text-[#1F2937] text-lg">
                        {sale.productCount}
                      </p>
                    </div>
                    <div className="p-3 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                      <p className="text-xs text-[#9CA3AF] mb-1">{t("flash_sales.card.sold")}</p>
                      <p className="font-bold text-[#1F2937] text-lg">
                        {sale.soldCount}
                      </p>
                    </div>
                    <div className="p-3 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB]">
                      <p className="text-xs text-[#9CA3AF] mb-1">{t("flash_sales.card.max_quantity")}</p>
                      <p className="font-bold text-[#1F2937] text-lg">
                        {sale.maxQuantity || "∞"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-[#9CA3AF]">
                      <Calendar className="h-4 w-4" />
                      <span>{t("flash_sales.card.start")} {formatDate(sale.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#9CA3AF]">
                      <Clock className="h-4 w-4" />
                      <span>{t("flash_sales.card.end")} {formatDate(sale.endTime)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-[#F3F4F6]"
                      asChild
                    >
                      <Link to={`/flash-sales/${sale.id}`}>
                        <Edit className="h-4 w-4 text-[#4B5563]" />
                      </Link>
                    </Button>
                    <Switch
                      checked={sale.isActive}
                      onCheckedChange={() =>
                        handleToggleStatus(sale.id, sale.isActive)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-[#FEF2F2]"
                      onClick={() => handleDelete(sale.id, sale.name)}
                    >
                      <Trash2 className="h-4 w-4 text-[#EF4444]" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FlashSaleForm({
  mode,
  flashSaleId,
}: {
  mode: "create" | "edit";
  flashSaleId?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === "edit");
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    discountPercentage: "",
    maxQuantity: "",
    isActive: true,
    productIds: [] as string[],
  });
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await products.getProducts({ limit: 1000 });
        if (response.data.success) {
          const productsList = response.data.data?.products || [];
          setAvailableProducts(productsList);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (mode === "edit" && flashSaleId) {
      const fetchFlashSale = async () => {
        try {
          setIsFetching(true);
          const response = await flashSales.getFlashSaleById(flashSaleId);
          if (response.data.success) {
            const sale = response.data.data.flashSale;

            // Helper to convert UTC date to local datetime-local format string
            const toLocalISOString = (dateStr: string) => {
              const date = new Date(dateStr);
              // Get timezone offset in minutes (e.g., -330 for IST)
              const offset = date.getTimezoneOffset();
              // Adjust date by subtracting the offset
              const localDate = new Date(date.getTime() - (offset * 60000));
              return localDate.toISOString().slice(0, 16);
            };

            setFormData({
              name: sale.name,
              startTime: toLocalISOString(sale.startTime),
              endTime: toLocalISOString(sale.endTime),
              discountPercentage: sale.discountPercentage.toString(),
              maxQuantity: sale.maxQuantity?.toString() || "",
              isActive: sale.isActive,
              productIds: sale.products?.map((p: any) => p.productId) || [],
            });
          }
        } catch (error: any) {
          // ... existing code ...
          toast.error(
            error.response?.data?.message || t("flash_sales.messages.load_sale_error")
          );
        } finally {
          setIsFetching(false);
        }
      };
      fetchFlashSale();
    }
  }, [mode, flashSaleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = {
        name: formData.name,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        discountPercentage: parseFloat(formData.discountPercentage),
        maxQuantity: formData.maxQuantity
          ? parseInt(formData.maxQuantity)
          : undefined,
        isActive: formData.isActive,
        productIds: formData.productIds,
      };

      let response;
      if (mode === "create") {
        response = await flashSales.createFlashSale(data);
      } else {
        response = await flashSales.updateFlashSale(flashSaleId!, data);
      }

      if (response.data.success) {
        toast.success(
          mode === "create" ? t("flash_sales.messages.create_success") : t("flash_sales.messages.update_success")
        );
        navigate("/flash-sales");
      } else {
        toast.error(response.data.message || (mode === "create" ? t("flash_sales.messages.create_error") : t("flash_sales.messages.update_error")));
      }
    } catch (error: any) {
      console.error(`Error ${mode}ing flash sale:`, error);
      toast.error(
        error.response?.data?.message || t("flash_sales.messages.save_error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">{t("flash_sales.loading_sale")}</p>
        </div>
      </div>
    );
  }

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
              <Link to="/flash-sales">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("flash_sales.back")}
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {mode === "create" ? t("flash_sales.create_title") : t("flash_sales.edit_title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {mode === "create"
                ? t("flash_sales.create_description")
                : t("flash_sales.edit_description")}
            </p>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-lg font-semibold text-[#1F2937]">
            {t("flash_sales.form.info_title")}
          </CardTitle>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {t("flash_sales.form.info_description")}
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="px-6 pb-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-[#4B5563]">
                  {t("flash_sales.form.name_label")} <span className="text-[#EF4444]">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("flash_sales.form.name_placeholder")}
                  required
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="discountPercentage"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("flash_sales.form.discount_label")} <span className="text-[#EF4444]">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="discountPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discountPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountPercentage: e.target.value,
                      })
                    }
                    placeholder={t("flash_sales.form.discount_placeholder")}
                    required
                    className="border-[#E5E7EB] focus:border-primary pr-10"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="startTime"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("flash_sales.form.start_time_label")} <span className="text-[#EF4444]">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="endTime"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("flash_sales.form.end_time_label")} <span className="text-[#EF4444]">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  required
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="maxQuantity"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("flash_sales.form.max_quantity_label")}
                </Label>
                <Input
                  id="maxQuantity"
                  type="number"
                  min="1"
                  value={formData.maxQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, maxQuantity: e.target.value })
                  }
                  placeholder={t("flash_sales.form.max_quantity_placeholder")}
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="isActive"
                    className="text-sm font-medium text-[#4B5563]"
                  >
                    {t("flash_sales.form.active_status_label")}
                  </Label>
                  <p className="text-xs text-[#9CA3AF]">
                    {t("flash_sales.form.active_status_hint")}
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#4B5563]">
                {t("flash_sales.form.products_label")} <span className="text-[#EF4444]">*</span>
              </Label>
              <MultiSelectCombo
                items={availableProducts.map((p) => ({
                  id: p.id,
                  name: p.name,
                }))}
                selectedIds={formData.productIds}
                onChange={(ids: string[]) => {
                  setFormData({
                    ...formData,
                    productIds: ids,
                  });
                }}
                placeholder={t("flash_sales.form.products_placeholder")}
              />
              <p className="text-xs text-[#9CA3AF]">
                <span>
                  {formData.productIds.length > 0
                    ? t("flash_sales.form.products_selected").replace("{count}", String(formData.productIds.length))
                    : t("flash_sales.form.products_placeholder")}
                </span>
              </p>
            </div>
          </CardContent>
          <CardFooter className="px-6 pb-6 pt-0 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => navigate("/flash-sales")}
            >
              {t("flash_sales.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? t("flash_sales.creating") : t("flash_sales.updating")}
                </>
              ) : mode === "create" ? (
                t("flash_sales.create_sale")
              ) : (
                t("flash_sales.update_sale")
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
