
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { coupons, partners, categories, brands, products } from "@/api/adminService";
import axios from "axios";
import { Button } from "@/components/ui/button";
import MultiSelectCombo from "@/components/MultiSelectCombo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Ticket,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit,
  AlertTriangle,
  PercentIcon,
  Calendar,
  CheckCircle,
  XCircle,
  IndianRupee,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

interface CouponItem {
  id: string;
  code?: string;
  description?: string;
  discountType?: string;
  discountValue?: number;
  minOrderAmount?: number;
  maxUses?: number;
  couponPartners?: Array<{ partner: { id: string; name?: string }; commission?: number | null }>;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  categories?: Array<{ id: string; name?: string; category?: { id: string; name?: string } }>;
  products?: Array<{ id: string; name?: string; product?: { id: string; name?: string } }>;
  brands?: Array<{ id: string; name?: string; brand?: { id: string; name?: string } }>;
  couponCategories?: Array<{ categoryId: string; category?: { id: string; name?: string } }>;
  couponProducts?: Array<{ productId: string; product?: { id: string; name?: string } }>;
  couponBrands?: Array<{ brandId: string; brand?: { id: string; name?: string } }>;
}

export default function CouponsPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewCoupon = location.pathname.includes("/new");
  const isEditCoupon = !!id;

  // Use lazy loading for the components to reduce initial load time
  return (
    <>
      {isNewCoupon && <CouponForm mode="create" />}
      {isEditCoupon && <CouponForm mode="edit" couponId={id} />}
      {!isNewCoupon && !isEditCoupon && <CouponsList />}
    </>
  );
}

function CouponsList() {
  const { t } = useLanguage();
  const [couponsList, setCouponsList] = useState<CouponItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch coupons
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await coupons.getCoupons();

        if (response.data.success) {
          const fetchedCoupons = response.data.data?.coupons || [];

          setCouponsList(fetchedCoupons as CouponItem[]);
        } else {
          const errorMsg = response.data.message || "Failed to fetch coupons";
          console.error("Coupons fetch error:", errorMsg);
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (error: unknown) {
        console.error("Error fetching coupons:", error);
        let errorMsg = "Failed to load coupons. Please try again.";
        if (error instanceof Error) errorMsg = error.message;
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoupons();
  }, []);

  // Handle coupon deletion
  const handleDeleteCoupon = async (couponId: string, couponCode: string) => {
    if (
      !window.confirm(t('coupons.messages.delete_confirm', { code: couponCode }))
    ) {
      return;
    }

    try {
      const response = await coupons.deleteCoupon(couponId);
      if (response.data.success) {
        toast.success(t('coupons.messages.delete_success'));
        // Update the coupons list
        setCouponsList(couponsList.filter((coupon) => coupon.id !== couponId));
      } else {
        toast.error(response.data.message || t('coupons.messages.delete_error'));
      }
    } catch (error: unknown) {
      console.error("Error deleting coupon:", error);
      toast.error("An error occurred while deleting the coupon");
    }
  };

  // Handle coupon active/inactive toggle
  const handleToggleStatus = async (couponId: string, currentStatus: boolean, couponCode: string) => {
    const newStatus = !currentStatus;
    const action = newStatus ? "activate" : "deactivate";

    try {
      const response = await coupons.updateCoupon(couponId, {
        isActive: newStatus
      });

      if (response.data.success) {
        toast.success(t('coupons.messages.status_update_success', { code: couponCode, action }));

        // Update the coupon in the list
        setCouponsList(couponsList.map(coupon =>
          coupon.id === couponId
            ? { ...coupon, isActive: newStatus }
            : coupon
        ));
      } else {
        toast.error(response.data.message || t('coupons.messages.status_update_error', { action }));
      }
    } catch (error: unknown) {
      console.error(`Error ${action}ing coupon: `, error);
      toast.error(`An error occurred while ${action}ing the coupon`);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">
            {t('coupons.loading')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FEF2F2] mb-4">
          <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
        </div>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-1.5">{t('coupons.error_title')}</h2>
        <p className="text-center text-[#9CA3AF] mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-[#4CAF50] text-[#2E7D32] hover:bg-[#E8F5E9]"
          onClick={() => window.location.reload()}
        >
          {t('coupons.try_again')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t('coupons.title')}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t('coupons.description')}
            </p>
          </div>
          <Button
            asChild
            className=""
          >
            <Link to="/coupons/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('coupons.add_coupon')}
            </Link>
          </Button>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Coupons List */}
      {couponsList.length === 0 ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
              <Ticket className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
              {t('coupons.no_coupons')}
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
              {t('coupons.no_coupons_desc')}
            </p>
            <Button
              className=""
              asChild
            >
              <Link to="/coupons/new">{t('coupons.add_first_coupon')}</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {couponsList.map((coupon) => (
            <Card
              key={coupon.id}
              className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F5E9]">
                        <Ticket className="h-5 w-5 text-[#2E7D32]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-[#1F2937] truncate">
                          {coupon.code}
                        </h3>
                        {coupon.description && (
                          <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                            {coupon.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={!!coupon.isActive}
                      onCheckedChange={() =>
                        handleToggleStatus(coupon.id, !!coupon.isActive, coupon.code || "")
                      }
                    />
                    {coupon.isActive ? (
                      <Badge className="bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs font-medium">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('coupons.status.active')}
                      </Badge>
                    ) : (
                      <Badge className="bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB] text-xs font-medium">
                        <XCircle className="h-3 w-3 mr-1" />
                        {t('coupons.status.inactive')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {/* Discount */}
                  <div className="flex items-center gap-2">
                    {coupon.discountType === "PERCENTAGE" ? (
                      <>
                        <PercentIcon className="h-4 w-4 text-[#4CAF50]" />
                        <span className="font-semibold text-[#1F2937]">
                          {coupon.discountValue}% {t('coupons.discount.off')}
                        </span>
                      </>
                    ) : (
                      <>
                        <IndianRupee className="h-4 w-4 text-[#4CAF50]" />
                        <span className="font-semibold text-[#1F2937]">
                          ₹{coupon.discountValue} {t('coupons.discount.off')}
                        </span>
                      </>
                    )}
                    {coupon.minOrderAmount && (
                      <span className="text-xs text-[#9CA3AF]">
                        ({t('coupons.discount.min_order')} ₹{coupon.minOrderAmount})
                      </span>
                    )}
                  </div>

                  {/* Targets */}
                  <div className="text-sm text-[#4B5563]">
                    {(() => {
                      const dedupe = (values: Array<string>) => Array.from(new Set(values.filter(Boolean)));
                      const categoryNames = dedupe([
                        ...((coupon.categories ?? [])
                          .map((entry) => entry.category?.name ?? entry.name ?? "")
                          .filter((name): name is string => Boolean(name))),
                        ...((coupon.couponCategories ?? [])
                          .map((entry) => entry.category?.name ?? "")
                          .filter((name): name is string => Boolean(name))),
                      ]);
                      const productNames = dedupe([
                        ...((coupon.products ?? [])
                          .map((entry) => entry.product?.name ?? entry.name ?? "")
                          .filter((name): name is string => Boolean(name))),
                        ...((coupon.couponProducts ?? [])
                          .map((entry) => entry.product?.name ?? "")
                          .filter((name): name is string => Boolean(name))),
                      ]);
                      const brandNames = dedupe([
                        ...((coupon.brands ?? [])
                          .map((entry) => entry.brand?.name ?? entry.name ?? "")
                          .filter((name): name is string => Boolean(name))),
                        ...((coupon.couponBrands ?? [])
                          .map((entry) => entry.brand?.name ?? "")
                          .filter((name): name is string => Boolean(name))),
                      ]);

                      if (!categoryNames.length && !productNames.length && !brandNames.length) {
                        return (
                          <Badge className="bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs">
                            {t('coupons.targets.all_items')}
                          </Badge>
                        );
                      }

                      const parts: string[] = [];
                      if (categoryNames.length) {
                        parts.push(`${categoryNames.length} ${t(categoryNames.length > 1 ? 'coupons.targets.categories' : 'coupons.targets.category')} `);
                      }
                      if (productNames.length) {
                        parts.push(`${productNames.length} ${t(productNames.length > 1 ? 'coupons.targets.products' : 'coupons.targets.product')} `);
                      }
                      if (brandNames.length) {
                        parts.push(`${brandNames.length} ${t(brandNames.length > 1 ? 'coupons.targets.brands' : 'coupons.targets.brand')} `);
                      }
                      return <span className="text-xs">{parts.join(", ")}</span>;
                    })()}
                  </div>

                  {/* Partner */}
                  {coupon.couponPartners && coupon.couponPartners.length > 0 && (
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-[#9CA3AF]" />
                      <span className="text-sm text-[#4B5563]">
                        {coupon.couponPartners.length} {t('coupons.partners_count')}
                      </span>
                    </div>
                  )}

                  {/* Valid Period */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#9CA3AF]" />
                    <span className="text-xs text-[#9CA3AF]">
                      {formatDate(coupon.startDate || "")}
                      {coupon.endDate && ` - ${formatDate(coupon.endDate || "")} `}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 hover:bg-[#F3F4F6]"
                    asChild
                  >
                    <Link to={`/coupons/${coupon.id}`}>
                      <Edit className="h-4 w-4 text-[#4B5563]" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 hover:bg-[#FEF2F2]"
                    onClick={() => handleDeleteCoupon(coupon.id, coupon.code || "")}
                  >
                    <Trash2 className="h-4 w-4 text-[#EF4444]" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CouponForm({
  mode,
  couponId,
}: {
  mode: "create" | "edit";
  couponId?: string;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === "edit");
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    minOrderAmount: "",
    maxUses: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    isActive: true,
  });
  const [selectedPartners, setSelectedPartners] = useState<
    Array<{ partnerId: string; commission: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [partnersList, setPartnersList] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string }>>([]);
  const [brandsList, setBrandsList] = useState<Array<{ id: string; name: string }>>([]);
  const [productsList, setProductsList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);

  const mergeOptions = (
    existing: Array<{ id: string; name: string }>,
    extras: Array<{ id: string; name: string }>
  ) => {
    const map = new Map(existing.map((item) => [item.id, item]));
    extras.forEach((option) => {
      if (!map.has(option.id) || !map.get(option.id)?.name) {
        map.set(option.id, option);
      }
    });
    return Array.from(map.values());
  };

  // Fetch partners list for dropdown
  useEffect(() => {
    const fetchCatsAndBrands = async () => {
      try {
        const [catsRes, brandsRes, productsRes] = await Promise.all([
          categories.getCategories(),
          brands.getBrands(),
          products.getProducts({ limit: 100 }),
        ]);

        const dedupeById = (items: Array<{ id: string; name: string }>) => {
          const map = new Map<string, { id: string; name: string }>();
          items.forEach((item) => {
            if (!map.has(item.id)) {
              map.set(item.id, item);
            }
          });
          return Array.from(map.values());
        };

        const isObject = (value: unknown): value is Record<string, unknown> =>
          typeof value === "object" && value !== null;

        const rawCategories = catsRes.data.data?.categories || catsRes.data.data || [];
        const normalizedCategories = dedupeById(
          (Array.isArray(rawCategories) ? rawCategories : [])
            .map((entry) => {
              if (!isObject(entry)) return null;
              const categoryValue = isObject(entry.category) ? entry.category : undefined;
              const idCandidate = entry.id ?? entry.categoryId ?? categoryValue?.id ?? entry._id;
              if (idCandidate === undefined || idCandidate === null) return null;
              const nameCandidate = entry.name ?? categoryValue?.name ?? entry.label ?? entry.title;
              const id = String(idCandidate);
              const name = typeof nameCandidate === "string" && nameCandidate.trim()
                ? nameCandidate
                : `Category ${id} `;
              return { id, name };
            })
            .filter((item): item is { id: string; name: string } => Boolean(item))
        );

        const rawBrands = brandsRes.data.data?.brands || brandsRes.data.data || [];
        const normalizedBrands = dedupeById(
          (Array.isArray(rawBrands) ? rawBrands : [])
            .map((entry) => {
              if (!isObject(entry)) return null;
              const brandValue = isObject(entry.brand) ? entry.brand : undefined;
              const idCandidate = entry.id ?? entry.brandId ?? brandValue?.id ?? entry._id;
              if (idCandidate === undefined || idCandidate === null) return null;
              const nameCandidate = entry.name ?? brandValue?.name ?? entry.label ?? entry.title;
              const id = String(idCandidate);
              const name = typeof nameCandidate === "string" && nameCandidate.trim()
                ? nameCandidate
                : `Brand ${id} `;
              return { id, name };
            })
            .filter((item): item is { id: string; name: string } => Boolean(item))
        );

        const rawProducts = productsRes.data.data?.products || productsRes.data.data || [];
        const normalizedProducts = dedupeById(
          (Array.isArray(rawProducts) ? rawProducts : [])
            .map((entry) => {
              if (!isObject(entry)) return null;
              const productValue = isObject(entry.product) ? entry.product : undefined;
              const idCandidate = entry.id ?? entry.productId ?? productValue?.id ?? entry._id;
              if (idCandidate === undefined || idCandidate === null) return null;
              const nameCandidate = entry.name ?? productValue?.name ?? entry.label ?? entry.title;
              const id = String(idCandidate);
              const name = typeof nameCandidate === "string" && nameCandidate.trim()
                ? nameCandidate
                : `Product ${id} `;
              return { id, name };
            })
            .filter((item): item is { id: string; name: string } => Boolean(item))
        );

        setCategoriesList(normalizedCategories);
        setBrandsList(normalizedBrands);
        setProductsList(normalizedProducts);
      } catch (err) {
        console.warn('Failed to load categories/brands/products for coupon form', err);
      }
    };

    const fetchPartners = async () => {
      try {
        const response = await partners.getApprovedPartners();
        if (response.data.success) {
          // Handle both array and object with 'partners' key
          let fetchedPartners = [];
          if (Array.isArray(response.data.data)) {
            fetchedPartners = response.data.data;
          } else if (response.data.data?.partners) {
            fetchedPartners = response.data.data.partners;
          } else {
            fetchedPartners = [];
          }
          setPartnersList(fetchedPartners);
        } else {
          console.error("Partners fetch error:", response.data.message);
          toast.error("Failed to load partners");
        }
      } catch (error) {
        console.error("Error fetching partners:", error);
        toast.error("Failed to load partners");
      }
    };
    fetchPartners();
    fetchCatsAndBrands();
  }, []);

  // Fetch coupon details if in edit mode
  useEffect(() => {
    if (mode === "edit" && couponId) {
      const fetchCouponDetails = async () => {
        try {
          setIsFetching(true);
          const response = await coupons.getCouponById(couponId);
          console.log("Coupon details response:", response); // Debug logging

          if (response.data.success) {
            const couponData = response.data.data?.coupon as CouponItem | undefined;
            // Format dates properly for edit form
            const formatDateForInput = (dateString?: string) => {
              try {
                if (!dateString) return "";
                const date = new Date(dateString);
                return date.toISOString().split("T")[0];
              } catch (error) {
                console.warn("Date format error:", error);
                return "";
              }
            };

            setFormData({
              code: couponData?.code?.toUpperCase() || "",
              description: couponData?.description || "",
              discountType: couponData?.discountType || "PERCENTAGE",
              discountValue: couponData?.discountValue?.toString?.() || "",
              minOrderAmount: couponData?.minOrderAmount?.toString?.() || "",
              maxUses: couponData?.maxUses?.toString?.() || "",
              startDate: formatDateForInput(couponData?.startDate) || new Date().toISOString().split("T")[0],
              endDate: formatDateForInput(couponData?.endDate),
              isActive: couponData?.isActive ?? true,
            });

            // Set selected partners (handle both array and object with 'partners' key)
            let couponPartnersArr: Array<{ partner: { id: string }; commission?: number | null }> = [];
            if (Array.isArray(couponData?.couponPartners)) {
              couponPartnersArr = couponData.couponPartners;
            } else if ((couponData as unknown as { couponPartners?: { partners?: Array<{ partner: { id: string }; commission?: number | null }> } })?.couponPartners?.partners) {
              couponPartnersArr = (couponData as unknown as { couponPartners: { partners: Array<{ partner: { id: string }; commission?: number | null }> } }).couponPartners.partners;
            }
            if (couponPartnersArr.length > 0) {
              setSelectedPartners(
                couponPartnersArr.map((cp: { partner: { id: string }; commission?: number | null }) => ({
                  partnerId: cp.partner.id,
                  commission: cp.commission != null ? cp.commission.toString() : "",
                }))
              );
            } else {
              setSelectedPartners([]);
            }

            // populate target selects if present
            const toRecord = (value: unknown): Record<string, unknown> | null =>
              typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

            const coerceId = (value: unknown): string | undefined => {
              if (typeof value === "string" || typeof value === "number") return String(value);
              return undefined;
            };

            const collectTargetIds = (
              primary: unknown[] | undefined,
              fallback: unknown[] | undefined,
              directKey: "categoryId" | "productId" | "brandId",
              nestedKey: "category" | "product" | "brand"
            ) => {
              const ids: string[] = [];
              const appendFrom = (source?: unknown[]) => {
                (source ?? []).forEach((entry) => {
                  const record = toRecord(entry);
                  if (!record) return;
                  const nested = toRecord(record[nestedKey]);
                  const idCandidate =
                    coerceId(record[directKey]) ??
                    coerceId(nested?.id) ??
                    coerceId(record.id) ??
                    coerceId(record._id);
                  if (idCandidate) ids.push(idCandidate);
                });
              };

              appendFrom(primary);
              appendFrom(fallback);
              return Array.from(new Set(ids));
            };

            const collectTargetOptions = (
              primary: unknown[] | undefined,
              fallback: unknown[] | undefined,
              directKey: "categoryId" | "productId" | "brandId",
              nestedKey: "category" | "product" | "brand",
              fallbackLabel: string
            ) => {
              const options = new Map<string, { id: string; name: string }>();
              const appendFrom = (source?: unknown[]) => {
                (source ?? []).forEach((entry) => {
                  const record = toRecord(entry);
                  if (!record) return;
                  const nested = toRecord(record[nestedKey]);
                  const idCandidate =
                    coerceId(record[directKey]) ??
                    coerceId(nested?.id) ??
                    coerceId(record.id) ??
                    coerceId(record._id);
                  if (!idCandidate) return;
                  const nameCandidate =
                    typeof nested?.name === "string" && nested.name.trim()
                      ? nested.name
                      : typeof record.name === "string" && record.name.trim()
                        ? record.name
                        : typeof record.label === "string" && record.label.trim()
                          ? record.label
                          : typeof record.title === "string" && record.title.trim()
                            ? record.title
                            : `${fallbackLabel} ${idCandidate} `;
                  if (!options.has(idCandidate)) {
                    options.set(idCandidate, { id: idCandidate, name: nameCandidate });
                  }
                });
              };

              appendFrom(primary);
              appendFrom(fallback);
              return Array.from(options.values());
            };

            setSelectedCategoryIds(
              collectTargetIds(couponData?.categories, couponData?.couponCategories, "categoryId", "category")
            );
            setSelectedProductIds(
              collectTargetIds(couponData?.products, couponData?.couponProducts, "productId", "product")
            );
            setSelectedBrandIds(
              collectTargetIds(couponData?.brands, couponData?.couponBrands, "brandId", "brand")
            );

            const prefilledCategories = collectTargetOptions(
              couponData?.categories,
              couponData?.couponCategories,
              "categoryId",
              "category",
              "Category"
            );
            const prefilledProducts = collectTargetOptions(
              couponData?.products,
              couponData?.couponProducts,
              "productId",
              "product",
              "Product"
            );
            const prefilledBrands = collectTargetOptions(
              couponData?.brands,
              couponData?.couponBrands,
              "brandId",
              "brand",
              "Brand"
            );

            if (prefilledCategories.length) {
              setCategoriesList((prev) => mergeOptions(prev, prefilledCategories));
            }
            if (prefilledProducts.length) {
              setProductsList((prev) => mergeOptions(prev, prefilledProducts));
            }
            if (prefilledBrands.length) {
              setBrandsList((prev) => mergeOptions(prev, prefilledBrands));
            }
          } else {
            setError(response.data.message || t('coupons.messages.fetch_error'));
          }
        } catch (error: unknown) {
          console.error("Error fetching coupon:", error);
          setError(t('coupons.messages.fetch_error'));
        } finally {
          setIsFetching(false);
        }
      };

      fetchCouponDetails();
    }
  }, [mode, couponId]);

  // Handle partner add/remove
  const addPartner = () => {
    setSelectedPartners([...selectedPartners, { partnerId: "", commission: "" }]);
  };

  const removePartner = (index: number) => {
    setSelectedPartners(selectedPartners.filter((_, i) => i !== index));
  };

  const updatePartner = (index: number, field: "partnerId" | "commission", value: string) => {
    const updated = [...selectedPartners];
    updated[index][field] = value;

    // If updating partnerId, check for duplicates
    if (field === "partnerId" && value) {
      const duplicateExists = updated.some((partner, i) =>
        i !== index && partner.partnerId === value
      );

      if (duplicateExists) {
        const partnerName = partnersList.find(p => p.id === value)?.name || value;
        setError(t('coupons.messages.partner_duplicate', { partnerName }));
        return; // Don't update if duplicate
      }
    }

    setSelectedPartners(updated);

    // Clear error if no duplicates
    if (error && error.includes("already assigned")) {
      setError(null);
    }
  };

  // Handle form input changes
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    // Special handling for coupon code - convert to uppercase immediately
    if (name === "code") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase(),
      }));
    } else {
      // Normal handling for other fields
      setFormData((prev) => ({
        ...prev,
        [name]:
          type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      }));
    }

    // Clear error when user changes input
    if (error) {
      setError(null);
    }
  };

  // Validate form before submission
  const validateForm = () => {
    // Check if code is empty
    if (!formData.code.trim()) {
      setError(t('coupons.messages.code_required'));
      return false;
    }

    // Check if code contains only valid characters
    if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      setError(
        t('coupons.messages.code_invalid')
      );
      return false;
    }

    // Make sure discount value is a valid number and greater than 0
    const discountValue = parseFloat(formData.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      setError(t('coupons.messages.discount_positive'));
      return false;
    }

    // Validate discount value based on discount type
    if (formData.discountType === "PERCENTAGE" && discountValue > 100) {
      setError(t('coupons.messages.discount_percentage_limit'));
      return false;
    }

    // If minimum order amount is provided, make sure it's a valid number
    if (
      formData.minOrderAmount &&
      (isNaN(parseFloat(formData.minOrderAmount)) ||
        parseFloat(formData.minOrderAmount) < 0)
    ) {
      setError(t('coupons.messages.min_order_positive'));
      return false;
    }

    // If max uses is provided, make sure it's a valid positive integer
    if (
      formData.maxUses &&
      (isNaN(parseInt(formData.maxUses)) || parseInt(formData.maxUses) < 1)
    ) {
      setError(t('coupons.messages.max_uses_integer'));
      return false;
    }

    // Make sure end date is after start date if provided
    if (
      formData.endDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      setError(t('coupons.messages.end_date_invalid'));
      return false;
    }

    // Validate partners
    if (selectedPartners.length > 0) {
      // Check for empty partner IDs
      const emptyPartners = selectedPartners.filter(p => !p.partnerId);
      if (emptyPartners.length > 0) {
        setError(t('coupons.messages.partner_required'));
        return false;
      }

      // Check for duplicate partners
      const partnerIds = selectedPartners.map(p => p.partnerId);
      const uniquePartnerIds = [...new Set(partnerIds)];
      if (partnerIds.length !== uniquePartnerIds.length) {
        setError(t('coupons.messages.partner_duplicate'));
        return false;
      }

      // Validate commission values
      for (const partner of selectedPartners) {
        if (partner.commission && partner.commission.trim()) {
          const commission = parseFloat(partner.commission);
          if (isNaN(commission) || commission < 0 || commission > 100) {
            const partnerName = partnersList.find(p => p.id === partner.partnerId)?.name || "Partner";
            setError(t('coupons.messages.commission_limit', { name: partnerName }));
            return false;
          }
        }
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
      const categoryIds = uniq(selectedCategoryIds);
      const productIds = uniq(selectedProductIds);
      const brandIds = uniq(selectedBrandIds);

      const data = {
        ...formData,
        // Make sure code is uppercase when submitting to backend
        code: formData.code.toUpperCase(),
        discountType: formData.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
        discountValue: parseFloat(formData.discountValue),
        minOrderAmount: formData.minOrderAmount
          ? parseFloat(formData.minOrderAmount)
          : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        partners: selectedPartners.length > 0
          ? selectedPartners.map(p => ({
            partnerId: p.partnerId,
            commission: p.commission ? parseFloat(p.commission) : undefined,
          }))
          : undefined,
        categoryIds,
        productIds,
        brandIds,
      };

      let response;
      if (mode === "create") {
        response = await coupons.createCoupon(data);
      } else {
        response = await coupons.updateCoupon(couponId!, data);
      }

      if (response.data.success) {
        toast.success(
          mode === "create"
            ? t('coupons.messages.create_success')
            : t('coupons.messages.update_success')
        );
        navigate("/coupons");
      } else {
        // Display the exact error message from the API
        const errorMsg = response.data.message || (mode === "create" ? t('coupons.messages.create_error') : t('coupons.messages.update_error'));
        setError(errorMsg);

        // Use toast.error with longer duration for visibility
        toast.error(errorMsg, {
          duration: 5000,
          position: "top-center",
        });
      }
    } catch (error: unknown) {
      console.error(`Error ${mode}ing coupon:`, error);

      // Prefer server-sent error message when available (Axios errors)
      let errorMessage = mode === "create" ? t('coupons.messages.create_exception') : t('coupons.messages.update_exception');

      if (axios.isAxiosError(error)) {
        const respData: unknown = error.response ? error.response.data : null;
        let serverMsg: string | null = null;

        if (respData && typeof respData === "object") {
          const d = respData as { [k: string]: unknown };
          if (typeof d.message === "string") serverMsg = d.message;
          else if (typeof d.error === "string") serverMsg = d.error;
        }

        if (serverMsg) {
          errorMessage = serverMsg;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);

      // Show detailed toast with longer duration
      toast.error(errorMessage, {
        duration: 5000,
        position: "top-center",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state during fetch
  if (isFetching) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">
            {t('coupons.loading')}
          </p>
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
              <Link to="/coupons">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('coupons.form.back_to_coupons')}
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {mode === "create" ? t('coupons.form.create_title') : t('coupons.form.edit_title')}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {mode === "create"
                ? t('coupons.form.create_desc')
                : t('coupons.form.edit_desc')}
            </p>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {error && (
        <Card className="bg-[#FEF2F2] border-[#FEE2E2] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#DC2626]">{error}</p>
              {error.includes("code already exists") && (
                <p className="text-xs text-[#991B1B] mt-1">
                  {t('coupons.messages.code_exists')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1F2937]">
              {t('coupons.form.basic_info')}
            </CardTitle>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {t('coupons.form.basic_info_desc')}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium text-[#4B5563]">
                  {t('coupons.form.code')} <span className="text-[#EF4444]">*</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  placeholder={t('coupons.form.code_placeholder')}
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  className={
                    error &&
                      (error.includes("code already exists") ||
                        error.includes("Coupon code"))
                      ? "border-[#EF4444] ring-1 ring-[#EF4444]"
                      : "border-[#E5E7EB] focus:border-primary"
                  }
                />
                {error &&
                  (error.includes("code already exists") ||
                    error.includes("Coupon code")) && (
                    <p className="text-xs text-[#EF4444] mt-1">
                      {error.includes("code already exists")
                        ? t('coupons.messages.code_exists')
                        : error}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-[#4B5563]">
                  {t('coupons.form.description')}
                </Label>
                <Input
                  id="description"
                  name="description"
                  placeholder={t('coupons.form.description_placeholder')}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discount Settings Card */}
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1F2937]">
              {t('coupons.form.discount_settings')}
            </CardTitle>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {t('coupons.form.discount_settings_desc')}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">

              <div className="space-y-2">
                <Label htmlFor="discountType" className="text-sm font-medium text-[#4B5563]">
                  {t('coupons.form.discount_type')} <span className="text-[#EF4444]">*</span>
                </Label>
                <select
                  id="discountType"
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F3F7F6] px-3 py-2 text-sm text-[#4B5563] focus:border-primary focus:outline-none"
                  required
                >
                  <option value="PERCENTAGE">{t('coupons.form.type_percentage')}</option>
                  <option value="FIXED_AMOUNT">{t('coupons.form.type_fixed')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue" className="text-sm font-medium text-[#4B5563]">
                  {t('coupons.form.discount_value')} <span className="text-[#EF4444]">*</span>
                </Label>
                <div className="flex">
                  <div className="flex items-center rounded-l-lg border border-r-0 border-[#E5E7EB] bg-[#F3F4F6] px-3">
                    {formData.discountType === "PERCENTAGE" ? (
                      <PercentIcon className="h-4 w-4 text-[#9CA3AF]" />
                    ) : (
                      <IndianRupee className="h-4 w-4 text-[#9CA3AF]" />
                    )}
                  </div>
                  <Input
                    id="discountValue"
                    name="discountValue"
                    type="number"
                    min="0"
                    step={formData.discountType === "PERCENTAGE" ? "1" : "0.01"}
                    placeholder={
                      formData.discountType === "PERCENTAGE" ? "10" : "100"
                    }
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    className={
                      error && error.includes("Discount value")
                        ? "border-[#EF4444] ring-1 ring-[#EF4444] rounded-l-none"
                        : "border-[#E5E7EB] focus:border-primary rounded-l-none"
                    }
                    required
                  />
                </div>
                {error && error.includes("Discount value") && (
                  <p className="text-xs text-[#EF4444] mt-1">{error}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="minOrderAmount" className="text-sm font-medium text-[#4B5563]">
                  {t('coupons.form.min_order_amount')}
                </Label>
                <div className="flex">
                  <div className="flex items-center rounded-l-lg border border-r-0 border-[#E5E7EB] bg-[#F3F4F6] px-3">
                    <IndianRupee className="h-4 w-4 text-[#9CA3AF]" />
                  </div>
                  <Input
                    id="minOrderAmount"
                    name="minOrderAmount"
                    type="number"
                    min="0"
                    placeholder="500"
                    value={formData.minOrderAmount}
                    onChange={handleInputChange}
                    className="border-[#E5E7EB] focus:border-primary rounded-l-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUses" className="text-sm font-medium text-[#4B5563]">
                  {t('coupons.form.max_uses')}
                </Label>
                <Input
                  id="maxUses"
                  name="maxUses"
                  type="number"
                  min="0"
                  step="1"
                  placeholder={t('coupons.form.max_uses_placeholder')}
                  value={formData.maxUses}
                  onChange={handleInputChange}
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Selection Card */}
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1F2937]">
              {t('coupons.form.target_selection')}
            </CardTitle>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {t('coupons.form.target_selection_desc')}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">

            <div className="space-y-4">
              <div className="space-y-2">
                <MultiSelectCombo
                  items={categoriesList}
                  selectedIds={selectedCategoryIds}
                  onChange={setSelectedCategoryIds}
                  label={t('coupons.form.target_categories')}
                  placeholder={t('coupons.form.select_placeholder_categories')}
                  maxHeight={240}
                />
                <p className="text-xs text-[#9CA3AF]">{t('coupons.form.target_hint_categories')}</p>
              </div>

              <div className="space-y-2">
                <MultiSelectCombo
                  items={productsList}
                  selectedIds={selectedProductIds}
                  onChange={setSelectedProductIds}
                  label={t('coupons.form.target_products')}
                  placeholder={t('coupons.form.select_placeholder_products')}
                  maxHeight={240}
                />
                <p className="text-xs text-[#9CA3AF]">{t('coupons.form.target_hint_products')}</p>
              </div>

              <div className="space-y-2">
                <MultiSelectCombo
                  items={brandsList}
                  selectedIds={selectedBrandIds}
                  onChange={setSelectedBrandIds}
                  label={t('coupons.form.target_brands')}
                  placeholder={t('coupons.form.select_placeholder_brands')}
                  maxHeight={240}
                />
                <p className="text-xs text-[#9CA3AF]">{t('coupons.form.target_hint_brands')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity Period Card */}
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1F2937]">
              {t('coupons.form.validity_period')}
            </CardTitle>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {t('coupons.form.validity_period_desc')}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">

              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-medium text-[#4B5563]">
                  {t('coupons.form.start_date')} <span className="text-[#EF4444]">*</span>
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-medium text-[#4B5563]">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={formData.startDate}
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-sm font-medium text-[#4B5563]">
                    Active Status
                  </Label>
                  <p className="text-xs text-[#9CA3AF]">
                    Enable or disable this coupon
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive as boolean}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partner Assignments Card */}
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-[#1F2937]">
                  {t('coupons.form.partner_assignments')}
                </CardTitle>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  {t('coupons.form.partner_assignments_desc')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPartner}
                className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('coupons.form.add_partner')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">

            {selectedPartners.length === 0 ? (
              <div className="text-center p-6 border-2 border-dashed border-[#E5E7EB] rounded-lg bg-[#F3F7F6]">
                <p className="text-sm text-[#9CA3AF]">
                  {t('coupons.form.no_partners_assigned')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedPartners.map((partner, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 border border-[#E5E7EB] rounded-lg bg-[#F3F7F6]"
                  >
                    <div className="flex-1 space-y-2">
                      <select
                        value={partner.partnerId}
                        onChange={(e) => updatePartner(index, "partnerId", e.target.value)}
                        className={`flex h-10 w-full rounded-lg border px-3 py-2 text-sm ${error &&
                          error.includes("already assigned") &&
                          selectedPartners.some(
                            (p, i) => i !== index && p.partnerId === partner.partnerId
                          )
                          ? "border-[#EF4444] ring-1 ring-[#EF4444] bg-[#FFFFFF]"
                          : "border-[#E5E7EB] bg-[#FFFFFF] focus:border-primary focus:outline-none"
                          }`}
                      >
                        <option value="">{t('coupons.form.select_partner')}</option>
                        {partnersList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.email})
                          </option>
                        ))}
                      </select>
                      {error &&
                        error.includes("already assigned") &&
                        selectedPartners.some(
                          (p, i) => i !== index && p.partnerId === partner.partnerId
                        ) && (
                          <p className="text-xs text-[#EF4444]">
                            {t('coupons.form.partner_already_assigned')}
                          </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex">
                        <div className="flex items-center rounded-l-lg border border-r-0 border-[#E5E7EB] bg-[#F3F4F6] px-3">
                          <PercentIcon className="h-4 w-4 text-[#9CA3AF]" />
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="5.0"
                          value={partner.commission}
                          onChange={(e) =>
                            updatePartner(index, "commission", e.target.value)
                          }
                          className="w-20 border-[#E5E7EB] focus:border-primary rounded-l-none"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePartner(index)}
                        className="h-10 w-10 hover:bg-[#FEF2F2]"
                      >
                        <X className="h-4 w-4 text-[#EF4444]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-[#9CA3AF]">
              {t('coupons.form.assign_partner_desc')}
            </p>

            <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-[#1E40AF] mb-2">
                    {t('coupons.form.commission_note_title')}
                  </h4>
                  <div className="text-xs text-[#1E3A8A] space-y-1">
                    <p>
                      {t('coupons.form.commission_example')}
                    </p>
                    <p>
                      • {t('coupons.form.commission_calc_1')}
                    </p>
                    <p>
                      • {t('coupons.form.commission_calc_2')}
                    </p>
                    <p className="text-[#1E40AF] font-medium mt-2">
                      {t('coupons.form.commission_final_note')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button
            type="button"
            variant="outline"
            className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
            onClick={() => navigate("/coupons")}
          >
            {t('coupons.form.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className=""
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? t('coupons.form.create_btn') : t('coupons.form.update_btn')}
          </Button>
        </div>
      </form>
    </div >
  );
}
