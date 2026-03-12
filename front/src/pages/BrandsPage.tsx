import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { brands } from "@/api/adminService";
import { useDropzone } from "react-dropzone";
import {
  Edit,
  Trash2,
  Eye,
  Loader2,
  Search,
  Plus,
  Tag,
  Package,
  MoreVertical,
} from "lucide-react";
import { getImageUrl } from "@/utils/image";
import { products } from "@/api/adminService";
import { MultiSelect } from "@/components/ui/multiselect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";

const TAG_OPTIONS = [
  { label: "Top", value: "TOP" },
  { label: "New", value: "NEW" },
  { label: "Hot", value: "HOT" },
];

interface Brand {
  id: string;
  name: string;
  slug: string;
  image: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  products: any[];
}

export default function BrandsPage() {
  const [brandsList, setBrandsList] = useState<Brand[]>([]);
  const [open, setOpen] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: "", image: null as File | null });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [assignModalBrand, setAssignModalBrand] = useState<Brand | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [brandTags, setBrandTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();

  // Fetch brands with tag filter
  const fetchBrands = async () => {
    try {
      setIsLoading(true);
      const params = activeTab !== "ALL" ? { tag: activeTab } : {};
      const res = await brands.getBrands(params);
      setBrandsList(res.data.data.brands || []);
    } catch (err) {
      toast.error(t("brands.messages.fetch_error"));
      console.error("Error fetching brands:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [activeTab]);

  // Filter brands by search query
  const filteredBrands = brandsList.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dropzone for image upload
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setForm((prev) => ({ ...prev, image: acceptedFiles[0] }));
      setImagePreview(URL.createObjectURL(acceptedFiles[0]));
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || (!form.image && !imagePreview)) {
      toast.error(t("brands.messages.name_image_required"));
      return;
    }
    if (brandTags.length === 0) {
      toast.error(t("brands.messages.tag_required"));
      return;
    }
    setCreating(true);
    try {
      if (editBrand) {
        await brands.updateBrand(editBrand.id, {
          name: form.name,
          image: form.image || undefined,
          tags: brandTags,
        });
        toast.success(t("brands.messages.update_success"));
      } else {
        await brands.createBrand({
          name: form.name,
          image: form.image!,
          tags: brandTags,
        });
        toast.success(t("brands.messages.create_success"));
      }
      setForm({ name: "", image: null });
      setImagePreview(null);
      setOpen(false);
      setEditBrand(null);
      fetchBrands();
    } catch (err) {
      toast.error(t("brands.messages.save_error"));
      console.error("Error creating or updating brand:", err);
    }
    setCreating(false);
  };

  const handleEdit = (brand: Brand) => {
    setEditBrand(brand);
    setBrandTags(brand.tags || []);
    setForm({ name: brand.name, image: null });
    setImagePreview(getImageUrl(brand.image));
    setOpen(true);
  };

  const handleDelete = async (brandId: string) => {
    if (
      !window.confirm(t("brands.messages.delete_confirm"))
    )
      return;
    try {
      await brands.deleteBrand(brandId);
      toast.success(t("brands.messages.delete_success"));
      fetchBrands();
    } catch (err) {
      toast.error(t("brands.messages.delete_error"));
      console.error("Error deleting brand:", brandId, err);
    }
  };

  const handleShowProducts = (brand: Brand) => {
    setAssignModalBrand(brand);
  };

  const handleDialogClose = () => {
    setOpen(false);
    setEditBrand(null);
    setForm({ name: "", image: null });
    setImagePreview(null);
    setBrandTags([]);
  };

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t("brands.title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t("brands.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                type="search"
                placeholder={t("brands.search_placeholder")}
                className="pl-9 rounded-full border-[#E5E7EB] bg-[#FFFFFF] focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) handleDialogClose();
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className=""
                  onClick={() => {
                    setEditBrand(null);
                    setForm({ name: "", image: null });
                    setImagePreview(null);
                    setBrandTags([]);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("brands.add_button")}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-[#1F2937]">
                    {editBrand ? t("brands.dialog.edit_title") : t("brands.dialog.add_title")}
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleCreateOrUpdateBrand}
                  className="space-y-5"
                >
                  <div>
                    <label className="text-sm font-medium text-[#4B5563] mb-1.5 block">
                      {t("brands.form.name_label")}
                    </label>
                    <Input
                      name="name"
                      placeholder={t("brands.form.name_placeholder")}
                      value={form.name}
                      onChange={handleInputChange}
                      required
                      className="border-[#E5E7EB] focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#4B5563] mb-1.5 block">
                      {t("brands.form.logo_label")}
                    </label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed border-[#E5E7EB] rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive
                        ? "bg-[#E8F5E9] border-[#4CAF50]"
                        : "bg-[#F3F7F6] hover:bg-[#F3F4F6]"
                        }`}
                    >
                      <input {...getInputProps()} />
                      {imagePreview ? (
                        <div className="space-y-2">
                          <img
                            src={imagePreview}
                            alt={t("brands.dropzone.preview_alt")}
                            className="mx-auto h-24 w-24 object-contain rounded-lg border border-[#E5E7EB]"
                          />
                          <p className="text-sm text-[#9CA3AF]">
                            {t("brands.dropzone.click_change")}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Package className="h-12 w-12 mx-auto text-[#9CA3AF]" />
                          <p className="text-sm text-[#4B5563] font-medium">
                            {t("brands.dropzone.drag_drop")}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">
                            {t("brands.dropzone.click_select")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#4B5563] mb-1.5 block">
                      {t("brands.form.tags_label")}
                    </label>
                    <MultiSelect
                      options={TAG_OPTIONS}
                      value={brandTags}
                      onChange={(val) => {
                        setBrandTags(val);
                      }}
                      placeholder={t("brands.form.tags_placeholder")}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-[#E5E7EB] hover:bg-[#F3F7F6]"
                      onClick={handleDialogClose}
                    >
                      {t("brands.actions.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating}
                      className="flex-1 "
                    >
                      {creating
                        ? editBrand
                          ? t("brands.actions.updating")
                          : t("brands.actions.creating")
                        : editBrand
                          ? t("brands.actions.update")
                          : t("brands.actions.create")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Premium Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {["ALL", ...TAG_OPTIONS.map((t) => t.value)].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === tab
              ? "bg-[#E8F5E9] text-[#2E7D32] shadow-sm"
              : "bg-[#FFFFFF] text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F7F6]"
              }`}
          >
            {tab === "ALL"
              ? t("brands.filters.all")
              : t(`brands.filters.${tab.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {/* Premium Brands List */}
      {isLoading ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#4CAF50]" />
          </div>
        </Card>
      ) : filteredBrands.length === 0 ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
              <Tag className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
              {searchQuery ? t("brands.empty.title_search") : t("brands.empty.title")}
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
              {searchQuery
                ? t("brands.empty.description_search")
                : t("brands.empty.description")}
            </p>
            {!searchQuery && (
              <Button
                className=""
                onClick={() => setOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("brands.empty.add_first")}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#E5E7EB]">
            {filteredBrands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center gap-4 p-4 hover:bg-[#F3F7F6] transition-colors"
              >
                {/* Brand Image */}
                <div className="flex-shrink-0">
                  <img
                    src={getImageUrl(brand.image)}
                    alt={brand.name}
                    className="h-16 w-16 object-contain rounded-lg border border-[#E5E7EB] bg-[#F3F7F6] p-2"
                  />
                </div>

                {/* Brand Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-[#1F2937] text-base">
                          {brand.name}
                        </h3>
                        {brand.tags && brand.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {brand.tags.map((tag) => (
                              <Badge
                                key={tag}
                                className="bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7] text-xs"
                              >
                                {TAG_OPTIONS.find((t) => t.value === tag)
                                  ?.label || tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#9CA3AF]">
                        <span className="font-mono">{brand.slug}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {t("brands.products_count").replace("{count}", String(brand.products?.length || 0))}
                        </span>
                      </div>
                    </div>

                    {/* Product Count - Hidden on mobile */}
                    <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#E5E7EB] hover:bg-[#F3F7F6] text-sm"
                        onClick={() => handleShowProducts(brand)}
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        {t("brands.products_count").replace("{count}", String(brand.products?.length || 0))}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="flex-shrink-0">
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
                        onClick={() => handleShowProducts(brand)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t("brands.actions.view_products")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[#1F2937] hover:bg-[#F3F7F6]"
                        onClick={() => handleEdit(brand)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t("brands.actions.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#E5E7EB]" />
                      <DropdownMenuItem
                        className="text-[#EF4444] hover:bg-[#FEF2F2]"
                        onClick={() => handleDelete(brand.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("brands.actions.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Products Modal */}
      {assignModalBrand && (
        <ProductsAssignModal
          brand={assignModalBrand}
          open={!!assignModalBrand}
          onClose={() => setAssignModalBrand(null)}
          onUpdated={fetchBrands}
        />
      )}
    </div>
  );
}

function getProductImage(product: any) {
  // 1. Product images
  if (product.images && product.images.length > 0) {
    const primary =
      product.images.find((img: any) => img.isPrimary) || product.images[0];
    return getImageUrl(primary.url);
  }
  // 2. Variant images
  if (product.variants && product.variants.length > 0) {
    for (const variant of product.variants) {
      if (variant.images && variant.images.length > 0) {
        const primary =
          variant.images.find((img: any) => img.isPrimary) ||
          variant.images[0];
        return getImageUrl(primary.url);
      }
    }
  }
  // 3. Placeholder
  return getImageUrl(null);
}

function ProductsAssignModal({
  brand,
  open,
  onClose,
  onUpdated,
}: {
  brand: Brand;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [assigning, setAssigning] = useState(false);
  const { t } = useLanguage();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await products.getProducts({ page, limit: 10, search });
      setAllProducts(res.data.data.products || []);
      setTotalPages(res.data.data.pagination?.pages || 1);
      // Preselect products already assigned to this brand
      const assigned = new Set(
        (res.data.data.products || [])
          .filter((p: any) => p.brandId === brand.id)
          .map((p: any) => p.id)
      );
      setSelected(assigned as Set<string>);
    } catch (err) {
      toast.error(t("brands.messages.products_fetch_error"));
      console.error("Error fetching products for brand:", brand.id, err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchProducts();
    // eslint-disable-next-line
  }, [open, page, search]);

  // In ProductsAssignModal, after fetching products, if only one product is assigned, auto-select it
  useEffect(() => {
    if (open && allProducts.length === 1) {
      setSelected(new Set([allProducts[0].id]));
    }
    // eslint-disable-next-line
  }, [open, allProducts.length]);

  const handleSelect = (productId: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet as Set<string>;
    });
  };

  const handleAssign = async () => {
    setAssigning(true);
    try {
      const promises = Array.from(selected).map(async (id) => {
        const res = await products.getProductById(id);
        const product = res.data.data.product;
        await products.updateProduct(id, {
          ...product,
          brandId: brand.id,
        });
      });
      await Promise.all(promises);
      toast.success(t("brands.messages.assign_success"));
      // Immediately fetch updated brands list
      await onUpdated();
      // Optionally, fetch this brand's products again if needed
      setSelected(new Set());
      onClose();
    } catch (err) {
      toast.error(t("brands.messages.assign_error"));
      console.error("Error assigning products to brand:", err);
    }
    setAssigning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#FFFFFF] border-[#E5E7EB]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1F2937]">
            {t("brands.dialog.assign_title").replace("{brand}", brand.name)}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input
              placeholder={t("brands.assign.search_placeholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 border-[#E5E7EB] focus:border-primary"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-[#4CAF50]" />
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto border border-[#E5E7EB] rounded-xl">
            <div className="divide-y divide-[#E5E7EB]">
              {allProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 hover:bg-[#F3F7F6] transition-colors"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#E5E7EB] text-[#4CAF50] focus:ring-[#4CAF50]"
                    checked={selected.has(product.id)}
                    onChange={() => handleSelect(product.id)}
                  />
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="h-10 w-10 object-contain rounded-lg border border-[#E5E7EB] bg-[#F3F7F6]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1F2937] truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">
                      {product.brandId === brand.id
                        ? brand.name
                        : product.brand?.name || t("brands.assign.no_brand")}
                    </p>
                  </div>
                  {product.brandId === brand.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#FEF2F2]"
                      onClick={async () => {
                        await brands.removeProductFromBrand(
                          brand.id,
                          product.id
                        );
                        toast.success(t("brands.messages.remove_success"));
                        await onUpdated();
                        setSelected((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(product.id);
                          return newSet;
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1 border-[#E5E7EB] hover:bg-[#F3F7F6]"
            onClick={onClose}
          >
            {t("brands.actions.cancel")}
          </Button>
          <Button
            onClick={async () => {
              await handleAssign();
              onClose();
            }}
            disabled={assigning || selected.size === 0}
            className="flex-1 "
          >
            {assigning ? t("brands.assign.assigning") : t("brands.assign.assign_button")}
          </Button>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-[#4B5563] hover:text-[#1F2937]"
          >
            {t("brands.assign.previous")}
          </Button>
          <span className="text-sm text-[#9CA3AF]">
            {t("brands.assign.page_info").replace("{page}", String(page)).replace("{total}", String(totalPages))}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="text-[#4B5563] hover:text-[#1F2937]"
          >
            {t("brands.assign.next")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
