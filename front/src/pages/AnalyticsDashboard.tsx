import { useState, useEffect } from "react";
import api from "@/api/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Package,
  ShoppingCart,
  Eye,
  Tag,
  Layers,
  Weight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export default function AnalyticsDashboard() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [mostViewedProducts, setMostViewedProducts] = useState([]);
  const [usersWithCarts, setUsersWithCarts] = useState([]);
  const [activeTab, setActiveTab] = useState("products");

  // Fetch the active tab data on first load and when tab changes
  useEffect(() => {
    if (activeTab === "products") {
      fetchMostViewedProducts();
    } else if (activeTab === "carts") {
      fetchUsersWithCarts();
    }
  }, [activeTab]);

  const fetchMostViewedProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/analytics/products");
      setMostViewedProducts(
        response.data?.data?.productViews || response.data?.productViews || []
      );
    } catch (error) {
      console.error("Error fetching most viewed products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersWithCarts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/analytics/carts");
      setUsersWithCarts(
        response.data?.data?.users || response.data?.users || []
      );
    } catch (error) {
      console.error("Error fetching users with carts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t("analytics.title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t("analytics.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-[#4B5563]">
              <BarChart className="h-4 w-4 text-[#4CAF50]" />
              <span>
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Premium Segmented Control / Pills */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("products")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeTab === "products"
              ? "bg-[#E8F5E9] text-[#2E7D32] shadow-sm"
              : "bg-[#FFFFFF] text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F7F6]"
          )}
        >
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>{t("analytics.tabs.popular_products")}</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("carts")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeTab === "carts"
              ? "bg-[#E8F5E9] text-[#2E7D32] shadow-sm"
              : "bg-[#FFFFFF] text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F7F6]"
          )}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>{t("analytics.tabs.user_carts")}</span>
          </div>
        </button>
      </div>

      {/* Popular Products Tab */}
      {activeTab === "products" && (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#4CAF50]" />
              {t("analytics.products.title")}
            </CardTitle>
            <CardDescription className="text-[#4B5563]">
              {t("analytics.products.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-4 bg-[#F3F7F6] rounded-xl border border-[#E5E7EB]"
                  >
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-14 w-14 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {mostViewedProducts.length > 0 ? (
                  <div className="space-y-3">
                    {mostViewedProducts.map((item: any) => (
                      <div
                        key={item.productId}
                        className="flex justify-between items-center p-4 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="h-14 w-14 rounded-lg object-contain p-1 bg-white border border-[#E5E7EB] flex-shrink-0"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-[#E5E7EB]">
                              <Package className="h-6 w-6 text-[#9CA3AF]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[#1F2937] text-base mb-1.5 truncate">
                              {item.product.name}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 text-xs border-[#E5E7EB] text-[#4B5563] bg-[#F3F7F6]"
                              >
                                <Tag className="h-3 w-3" />
                                {formatCurrency(item.product.basePrice)}
                              </Badge>
                              {item.product.variants > 0 && (
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1 text-xs border-[#E5E7EB] text-[#4B5563] bg-[#F3F7F6]"
                                >
                                  <Layers className="h-3 w-3" />
                                  {item.product.variants} variants
                                </Badge>
                              )}
                              {item.product.variantInfo && (
                                <>
                                  {item.product.variantInfo.flavors > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="flex items-center gap-1 text-xs border-[#E5E7EB] text-[#4B5563] bg-[#F3F7F6]"
                                    >
                                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                                      {item.product.variantInfo.flavors} flavors
                                    </Badge>
                                  )}
                                  {item.product.variantInfo.weights > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="flex items-center gap-1 text-xs border-[#E5E7EB] text-[#4B5563] bg-[#F3F7F6]"
                                    >
                                      <Weight className="h-3 w-3" />
                                      {item.product.variantInfo.weights} weights
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-2xl font-bold text-[#4CAF50]">
                            {item.views}
                          </div>
                          <div className="text-xs text-[#9CA3AF] mt-0.5">
                            {t("analytics.products.views")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                      <Eye className="h-8 w-8 text-[#9CA3AF]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
                      {t("analytics.products.no_views")}
                    </h3>
                    <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
                      {t("analytics.products.no_views_desc")}
                    </p>
                    <Button
                      variant="outline"
                      className="border-[#4CAF50] text-[#2E7D32] hover:bg-[#E8F5E9]"
                      asChild
                    >
                      <a href="/products">{t("analytics.products.view_products")}</a>
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Carts Tab */}
      {activeTab === "carts" && (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[#4CAF50]" />
              {t("analytics.carts.title")}
            </CardTitle>
            <CardDescription className="text-[#4B5563]">
              {t("analytics.carts.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-6">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-[#FFFFFF]"
                  >
                    <div className="bg-[#F3F7F6] p-4 flex justify-between items-center border-b border-[#E5E7EB]">
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <div className="p-4">
                      <Skeleton className="h-32 w-full rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : usersWithCarts.length > 0 ? (
              <div className="space-y-6">
                {usersWithCarts.map((user: any) => (
                  <div
                    key={user.id}
                    className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <div className="bg-[#F3F7F6] p-4 flex justify-between items-center border-b border-[#E5E7EB]">
                      <div>
                        <h3 className="font-semibold text-[#1F2937] text-base">
                          {user.name || t("analytics.carts.anonymous")}
                        </h3>
                        <p className="text-sm text-[#9CA3AF] mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-[#4CAF50]">
                          {formatCurrency(user.totalValue)}
                        </div>
                        <div className="text-xs text-[#9CA3AF] mt-0.5">
                          {user.totalItems} {t("analytics.carts.items_in_cart")}
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-[#E5E7EB]">
                      {user.cartItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-4 hover:bg-[#F3F7F6] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              {item.product.image ? (
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="h-16 w-16 rounded-lg object-contain p-1 bg-white border border-[#E5E7EB] flex-shrink-0"
                                />
                              ) : (
                                <div className="h-16 w-16 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-[#E5E7EB]">
                                  <Package className="h-8 w-8 text-[#9CA3AF]" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[#1F2937] text-base mb-1">
                                  {item.product.name}
                                </div>

                                {item.product.category && (
                                  <div className="text-sm text-[#9CA3AF] mb-2">
                                    {item.product.category.name}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                  {item.product.variant.flavor && (
                                    <Badge className="bg-[#F3F7F6] text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] flex items-center text-xs">
                                      {item.product.variant.flavorImage ? (
                                        <img
                                          src={item.product.variant.flavorImage}
                                          alt={item.product.variant.flavor}
                                          className="w-3 h-3 rounded-full mr-1"
                                        />
                                      ) : (
                                        <div className="w-2 h-2 mr-1 rounded-full bg-primary"></div>
                                      )}
                                      {item.product.variant.flavor}
                                    </Badge>
                                  )}
                                  {item.product.variant.weight && (
                                    <Badge className="bg-[#F3F7F6] text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] text-xs">
                                      <Weight className="h-3 w-3 mr-1" />
                                      {item.product.variant.weight}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-semibold text-[#1F2937]">
                                {item.product.variant.salePrice ? (
                                  <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[#4CAF50] font-semibold">
                                        {formatCurrency(
                                          item.product.variant.salePrice
                                        )}
                                      </span>
                                      <span className="text-xs line-through text-[#9CA3AF]">
                                        {formatCurrency(
                                          item.product.variant.price
                                        )}
                                      </span>
                                    </div>
                                    {item.product.variant.discount > 0 && (
                                      <span className="text-xs bg-[#FEF2F2] text-[#EF4444] px-2 py-0.5 rounded-md font-medium mt-1">
                                        -{item.product.variant.discount}% OFF
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  formatCurrency(item.product.variant.price)
                                )}
                              </div>
                              <div className="mt-2 text-sm font-medium bg-[#E8F5E9] text-[#2E7D32] px-3 py-1 rounded-full inline-block">
                                {t("analytics.carts.qty")}: {item.quantity}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                  <ShoppingCart className="h-8 w-8 text-[#9CA3AF]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
                  {t("analytics.carts.no_carts")}
                </h3>
                <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
                  {t("analytics.carts.no_carts_desc")}
                </p>
                <Button
                  variant="outline"
                  className="border-[#4CAF50] text-[#2E7D32] hover:bg-[#E8F5E9]"
                  asChild
                >
                  <a href="/orders">{t("analytics.carts.view_orders")}</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
