import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { products, productSections } from "@/api/adminService";
import {
  Plus,
  Loader2,
  Edit,
  Trash2,
  X,
  HelpCircle,
  Info,
  Search,
  Package,
  Layers,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context";

interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  images?: Array<{
    id: string;
    url: string;
    isPrimary?: boolean;
  }>;
  price?: number;
  salePrice?: number;
  slug?: string;
  isActive?: boolean;
}

interface ProductSection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  displayOrder: number;
  maxProducts: number;
  items?: Array<{
    id: string;
    productId: string;
    displayOrder: number;
    product: Product;
  }>;
}

export default function ProductSectionsPage() {
  const { t } = useLanguage();
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ProductSection | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
    color: "bg-blue-500",
    displayOrder: 0,
    maxProducts: 15,
  });

  useEffect(() => {
    fetchSections();
    fetchAllProducts();
  }, []);

  useEffect(() => {
    if (sections.length > 0 && !activeTab) {
      setActiveTab(sections[0].id);
    }
  }, [sections]);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const response = await productSections.getProductSections();
      if (response.data?.success) {
        const sectionsList = response.data.data?.sections || [];
        setSections(sectionsList);
        if (sectionsList.length > 0 && !activeTab) {
          setActiveTab(sectionsList[0].id);
        }
      } else {
        setError("Failed to fetch sections");
      }
    } catch (error: any) {
      console.error("Error fetching sections:", error);
      setError("Failed to load product sections");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await products.getProducts({
        limit: 500,
        sortBy: "createdAt",
        order: "desc",
      });
      if (response.data?.success || response.data?.data?.products) {
        const productsList =
          response.data?.data?.products || response.data?.products || [];
        setAllProducts(productsList);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleCreateSection = async () => {
    try {
      const response = await productSections.createProductSection(formData);
      if (response.data?.success) {
        toast.success(t("product_sections.messages.create_success"));
        setShowCreateDialog(false);
        resetForm();
        fetchSections();
      } else {
        toast.error(response.data?.message || t("product_sections.messages.create_error"));
      }
    } catch (error: any) {
      console.error("Error creating section:", error);
      toast.error(error.response?.data?.message || "Failed to create section");
    }
  };

  const handleUpdateSection = async () => {
    if (!selectedSection) return;
    try {
      const response = await productSections.updateProductSection(
        selectedSection.id,
        formData
      );
      if (response.data?.success) {
        toast.success("Section updated successfully");
        setShowEditDialog(false);
        resetForm();
        fetchSections();
      } else {
        toast.error(response.data?.message || "Failed to update section");
      }
    } catch (error: any) {
      console.error("Error updating section:", error);
      toast.error(error.response?.data?.message || "Failed to update section");
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    try {
      const response = await productSections.deleteProductSection(sectionId);
      if (response.data?.success) {
        toast.success("Section deleted successfully");
        fetchSections();
      } else {
        toast.error(response.data?.message || "Failed to delete section");
      }
    } catch (error: any) {
      console.error("Error deleting section:", error);
      toast.error(error.response?.data?.message || "Failed to delete section");
    }
  };

  const handleAddProduct = async (productId: string) => {
    if (!selectedSection) return;
    try {
      const response = await productSections.addProductToSection(
        selectedSection.id,
        { productId }
      );
      if (response.data?.success) {
        toast.success("Product added to section");
        setShowAddProductDialog(false);
        fetchSections();
      } else {
        toast.error(
          response.data?.message || "Failed to add product to section"
        );
      }
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast.error(
        error.response?.data?.message || "Failed to add product to section"
      );
    }
  };

  const handleRemoveProduct = async (sectionId: string, productId: string) => {
    try {
      const response = await productSections.removeProductFromSection(
        sectionId,
        productId
      );
      if (response.data?.success) {
        toast.success("Product removed from section");
        fetchSections();
      } else {
        toast.error(
          response.data?.message || "Failed to remove product from section"
        );
      }
    } catch (error: any) {
      console.error("Error removing product:", error);
      toast.error(
        error.response?.data?.message || "Failed to remove product from section"
      );
    }
  };

  const handleToggleSectionActive = async (
    section: ProductSection,
    isActive: boolean
  ) => {
    try {
      const response = await productSections.updateProductSection(section.id, {
        isActive,
      });
      if (response.data?.success) {
        toast.success(
          `Section ${isActive ? "activated" : "deactivated"} successfully`
        );
        fetchSections();
      } else {
        toast.error(response.data?.message || "Failed to update section");
      }
    } catch (error: any) {
      console.error("Error updating section:", error);
      toast.error(error.response?.data?.message || "Failed to update section");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      icon: "",
      color: "bg-blue-500",
      displayOrder: 0,
      maxProducts: 15,
    });
    setSelectedSection(null);
  };

  const openEditDialog = (section: ProductSection) => {
    setSelectedSection(section);
    setFormData({
      name: section.name,
      slug: section.slug,
      description: section.description || "",
      icon: section.icon || "",
      color: section.color || "bg-blue-500",
      displayOrder: section.displayOrder,
      maxProducts: section.maxProducts,
    });
    setShowEditDialog(true);
  };

  const openAddProductDialog = (section: ProductSection) => {
    setSelectedSection(section);
    setSearchQuery("");
    setShowAddProductDialog(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">
            Loading product sections...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FEF2F2] mb-4">
          <X className="h-8 w-8 text-[#EF4444]" />
        </div>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-1.5">
          Something went wrong
        </h2>
        <p className="text-center text-[#9CA3AF] mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-[#4CAF50] text-[#2E7D32] hover:bg-[#E8F5E9]"
          onClick={fetchSections}
        >
          Try Again
        </Button>
      </div>
    );
  }

  const currentSection = sections.find((s) => s.id === activeTab);
  const sectionProducts =
    currentSection?.items?.map((item) => item.product) || [];
  const availableProducts = allProducts.filter(
    (p) => !sectionProducts.some((sp) => sp.id === p.id)
  );
  const filteredAvailableProducts = availableProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      return (
        product.images.find((img) => img.isPrimary)?.url || product.images[0].url
      );
    }
    return product.image || null;
  };

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t("product_sections.title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t("product_sections.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => setShowHelpDialog(true)}
              title="Help - How Product Sections Work"
            >
              <HelpCircle className="h-4 w-4 text-[#4B5563]" />
            </Button>
            <Button
              className=""
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("product_sections.create_button")}
            </Button>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {sections.length === 0 ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
              <Layers className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
              {t("product_sections.empty.title")}
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
              {t("product_sections.empty.description")}
            </p>
            <Button
              className=""
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("product_sections.empty.create_first")}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Premium Section Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {sections
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all relative",
                    activeTab === section.id
                      ? "bg-[#E8F5E9] text-[#2E7D32] shadow-sm"
                      : "bg-[#FFFFFF] text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F7F6]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{section.name}</span>
                    <Badge
                      className={cn(
                        "text-xs",
                        section.isActive
                          ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5]"
                          : "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]"
                      )}
                    >
                      {section.items?.length || 0}/{section.maxProducts}
                    </Badge>
                  </div>
                </button>
              ))}
          </div>

          {/* Section Content */}
          {currentSection && (
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl font-semibold text-[#1F2937]">
                        {currentSection.name}
                      </CardTitle>
                      <Badge
                        className={cn(
                          "text-xs",
                          currentSection.isActive
                            ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5]"
                            : "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]"
                        )}
                      >
                        {currentSection.isActive ? t("product_sections.status.active") : t("product_sections.status.inactive")}
                      </Badge>
                    </div>
                    {currentSection.description && (
                      <p className="text-sm text-[#9CA3AF] mt-1">
                        {currentSection.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#9CA3AF]">
                      <span>{t("product_sections.labels.slug")}: {currentSection.slug}</span>
                      <span>•</span>
                      <span>{t("product_sections.labels.display_order")}: {currentSection.displayOrder}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`switch-${currentSection.id}`}
                        className="text-sm text-[#4B5563] cursor-pointer"
                      >
                        {t("product_sections.status.active")}
                      </Label>
                      <Switch
                        id={`switch-${currentSection.id}`}
                        checked={currentSection.isActive}
                        onCheckedChange={(checked) =>
                          handleToggleSectionActive(currentSection, checked)
                        }
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-[#F3F4F6]"
                        >
                          <MoreVertical className="h-4 w-4 text-[#4B5563]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#FFFFFF] border-[#E5E7EB] shadow-lg"
                      >
                        <DropdownMenuItem
                          className="text-[#1F2937] hover:bg-[#F3F7F6]"
                          onClick={() => openEditDialog(currentSection)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t("product_sections.actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[#E5E7EB]" />
                        <DropdownMenuItem
                          className="text-[#EF4444] hover:bg-[#FEF2F2]"
                          onClick={() => handleDeleteSection(currentSection.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("product_sections.actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm text-[#9CA3AF]">
                    {t("product_sections.labels.products")}:{" "}
                    <span className="font-semibold text-[#1F2937]">
                      {currentSection.items?.length || 0}
                    </span>{" "}
                    / {currentSection.maxProducts}
                  </p>
                  {currentSection.items &&
                    currentSection.items.length < currentSection.maxProducts && (
                      <Button
                        size="sm"
                        onClick={() => openAddProductDialog(currentSection)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t("product_sections.labels.add_product")}
                      </Button>
                    )}
                </div>

                {currentSection.items && currentSection.items.length > 0 ? (
                  <div className="divide-y divide-[#E5E7EB]">
                    {currentSection.items
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((item) => {
                        const productImage = getProductImage(item.product);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 p-4 hover:bg-[#F3F7F6] transition-colors"
                          >
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              {productImage ? (
                                <img
                                  src={productImage}
                                  alt={item.product.name}
                                  className="h-14 w-14 rounded-lg object-contain p-1 bg-white border border-[#E5E7EB]"
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white border border-[#E5E7EB]">
                                  <Package className="h-6 w-6 text-[#9CA3AF]" />
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-[#1F2937] text-base mb-1 truncate">
                                    {item.product.name}
                                  </h3>
                                  {item.product.description && (
                                    <p className="text-xs text-[#9CA3AF] line-clamp-1">
                                      {item.product.description}
                                    </p>
                                  )}
                                </div>

                                {/* Price */}
                                <div className="text-right flex-shrink-0">
                                  {item.product.salePrice ? (
                                    <div className="flex flex-col items-end">
                                      <span className="font-bold text-[#1F2937]">
                                        ₹{item.product.salePrice}
                                      </span>
                                      <span className="text-xs line-through text-[#9CA3AF]">
                                        ₹{item.product.price}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-bold text-[#1F2937]">
                                      ₹{item.product.price || 0}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Display Order - Hidden on mobile */}
                            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                              <Badge className="bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB] text-xs">
                                Order: {item.displayOrder}
                              </Badge>
                            </div>

                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-[#FEF2F2] text-[#EF4444] hover:text-[#EF4444]"
                              onClick={() =>
                                handleRemoveProduct(
                                  currentSection.id,
                                  item.productId
                                )
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                      <Package className="h-8 w-8 text-[#9CA3AF]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
                      {t("product_sections.labels.no_products_title")}
                    </h3>
                    <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
                      {t("product_sections.labels.no_products_desc")}
                    </p>
                    <Button
                      className=""
                      onClick={() => openAddProductDialog(currentSection)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("product_sections.labels.add_product")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Premium Create Section Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {t("product_sections.form.create_title")}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {t("product_sections.form.create_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-[#4B5563]">
                {t("product_sections.form.name_label")} <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  });
                }}
                placeholder={t("product_sections.form.name_placeholder")}
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium text-[#4B5563]">
                Slug <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="e.g., featured-products"
                className="border-[#E5E7EB] focus:border-primary"
              />
              <p className="text-xs text-[#9CA3AF]">
                {t("product_sections.form.slug_hint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-medium text-[#4B5563]"
              >
                Description
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="color"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("product_sections.form.color_label")}
                </Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) =>
                    setFormData({ ...formData, color: value })
                  }
                >
                  <SelectTrigger className="border-[#E5E7EB] focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#FFFFFF] border-[#E5E7EB]">
                    <SelectItem value="bg-blue-500">Blue</SelectItem>
                    <SelectItem value="bg-green-500">Green</SelectItem>
                    <SelectItem value="bg-yellow-500">Yellow</SelectItem>
                    <SelectItem value="bg-red-500">Red</SelectItem>
                    <SelectItem value="bg-purple-500">Purple</SelectItem>
                    <SelectItem value="bg-pink-500">Pink</SelectItem>
                    <SelectItem value="bg-orange-500">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="maxProducts"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("product_sections.form.max_products_label")}
                </Label>
                <Input
                  id="maxProducts"
                  type="number"
                  value={formData.maxProducts}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxProducts: parseInt(e.target.value) || 15,
                    })
                  }
                  min={1}
                  max={50}
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="displayOrder"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("product_sections.form.display_order_label")}
              </Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: parseInt(e.target.value) || 0,
                  })
                }
                className="border-[#E5E7EB] focus:border-primary"
              />
              <p className="text-xs text-[#9CA3AF]">
                {t("product_sections.form.display_order_hint")}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              {t("product_sections.actions.cancel")}
            </Button>
            <Button
              className=""
              onClick={handleCreateSection}
            >
              {t("product_sections.actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium Edit Section Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {t("product_sections.form.edit_title")}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {t("product_sections.form.edit_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="edit-name"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("product_sections.form.name_label")} <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  });
                }}
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="edit-slug"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("product_sections.form.slug_label")} <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="edit-description"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("product_sections.form.description_label")}
              </Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="edit-color"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("product_sections.form.color_label")}
                </Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) =>
                    setFormData({ ...formData, color: value })
                  }
                >
                  <SelectTrigger className="border-[#E5E7EB] focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#FFFFFF] border-[#E5E7EB]">
                    <SelectItem value="bg-blue-500">Blue</SelectItem>
                    <SelectItem value="bg-green-500">Green</SelectItem>
                    <SelectItem value="bg-yellow-500">Yellow</SelectItem>
                    <SelectItem value="bg-red-500">Red</SelectItem>
                    <SelectItem value="bg-purple-500">Purple</SelectItem>
                    <SelectItem value="bg-pink-500">Pink</SelectItem>
                    <SelectItem value="bg-orange-500">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="edit-maxProducts"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("product_sections.form.max_products_label")}
                </Label>
                <Input
                  id="edit-maxProducts"
                  type="number"
                  value={formData.maxProducts}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxProducts: parseInt(e.target.value) || 15,
                    })
                  }
                  min={1}
                  max={50}
                  className="border-[#E5E7EB] focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="edit-displayOrder"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("product_sections.form.display_order_label")}
              </Label>
              <Input
                id="edit-displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: parseInt(e.target.value) || 0,
                  })
                }
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => {
                setShowEditDialog(false);
                resetForm();
              }}
            >
              {t("product_sections.actions.cancel")}
            </Button>
            <Button
              className=""
              onClick={handleUpdateSection}
            >
              {t("product_sections.actions.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium Add Product Dialog */}
      <Dialog
        open={showAddProductDialog}
        onOpenChange={setShowAddProductDialog}
      >
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              Add Product to Section
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Select products to add to "{selectedSection?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="max-h-96 overflow-y-auto border border-[#E5E7EB] rounded-xl">
              {filteredAvailableProducts.length > 0 ? (
                <div className="divide-y divide-[#E5E7EB]">
                  {filteredAvailableProducts.map((product) => {
                    const productImage = getProductImage(product);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-4 hover:bg-[#F3F7F6] transition-colors"
                      >
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {productImage ? (
                            <img
                              src={productImage}
                              alt={product.name}
                              className="h-12 w-12 rounded-lg object-contain p-1 bg-white border border-[#E5E7EB]"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white border border-[#E5E7EB]">
                              <Package className="h-5 w-5 text-[#9CA3AF]" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-[#1F2937] truncate">
                            {product.name}
                          </h4>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          {product.salePrice ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-[#1F2937]">
                                ₹{product.salePrice}
                              </span>
                              <span className="text-xs line-through text-[#9CA3AF]">
                                ₹{product.price}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-[#1F2937]">
                              ₹{product.price || 0}
                            </span>
                          )}
                        </div>

                        {/* Add Button */}
                        <Button
                          size="sm"
                          className=""
                          onClick={() => handleAddProduct(product.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                    <Package className="h-8 w-8 text-[#9CA3AF]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
                    {searchQuery
                      ? "No products found"
                      : "No available products"}
                  </h3>
                  <p className="text-sm text-[#9CA3AF]">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "All products are already in this section"}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => {
                setShowAddProductDialog(false);
                setSearchQuery("");
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-[#1F2937]">
              <Info className="h-5 w-5 text-[#4CAF50]" />
              How Product Sections Work
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4 text-left text-[#4B5563]">
              <div>
                <h3 className="font-semibold mb-3 text-base text-[#1F2937]">
                  What are Product Sections?
                </h3>
                <p className="text-sm mb-3 text-[#9CA3AF]">
                  Product Sections are customizable collections of products that
                  appear on your website's homepage. Each section can display up
                  to 15 products and helps organize D fixfront to showcase
                  featured items, best sellers, new arrivals, or any custom
                  collection you want to highlight.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-base text-[#1F2937]">
                  Step-by-Step Guide:
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-[#4B5563]">
                  <li>
                    <strong className="text-[#1F2937]">Create a Section:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-[#9CA3AF]">
                      <li>Click "Create Section" button</li>
                      <li>
                        Enter a <strong>Section Name</strong> (e.g., "Featured
                        Products", "Best Sellers", "Summer Collection")
                      </li>
                      <li>
                        <strong>Slug</strong> is auto-generated from the name
                        (you can edit it)
                      </li>
                      <li>
                        Add an optional <strong>Description</strong> (shown in
                        admin only)
                      </li>
                      <li>
                        Choose a <strong>Color Class</strong> for visual styling
                      </li>
                      <li>
                        Set <strong>Max Products</strong> (default: 15, maximum:
                        50)
                      </li>
                      <li>
                        Set <strong>Display Order</strong> (lower numbers appear
                        first on homepage)
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong className="text-[#1F2937]">Add Products to Section:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-[#9CA3AF]">
                      <li>Click on a section tab to view it</li>
                      <li>Click "Add Product" button</li>
                      <li>Search and select products from the list</li>
                      <li>Click the "+" button next to a product to add it</li>
                    </ul>
                  </li>
                  <li>
                    <strong className="text-[#1F2937]">Manage Sections:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-[#9CA3AF]">
                      <li>
                        <strong>Toggle Active/Inactive:</strong> Use the switch
                        to show/hide sections on the homepage
                      </li>
                      <li>
                        <strong>Edit:</strong> Click the menu icon to modify
                        section details
                      </li>
                      <li>
                        <strong>Delete:</strong> Click delete to remove a section
                      </li>
                    </ul>
                  </li>
                </ol>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
