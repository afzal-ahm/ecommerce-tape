import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import {
    Loader2,
    Layers,
    Plus,
    Edit,
    Trash2,
    AlertCircle,
    Info,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { useLanguage } from "@/context/LanguageContext";

interface PricingSlab {
    id: string;
    productId: string | null;
    variantId: string | null;
    minQty: number;
    maxQty: number | null;
    price: number;
    createdAt: string;
    product?: { id: string; name: string };
    variant?: { id: string; sku: string; product: { id: string; name: string } };
}

interface Product {
    id: string;
    name: string;
}

interface Variant {
    id: string;
    sku: string;
    product: Product;
}

export default function PricingSlabsPage() {
    const { t } = useLanguage();
    const [slabs, setSlabs] = useState<PricingSlab[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSlab, setEditingSlab] = useState<PricingSlab | null>(null);
    const [filterType, setFilterType] = useState<"all" | "product" | "variant">("all");
    const [selectedProductId, setSelectedProductId] = useState<string>("");

    // Form state
    const [formData, setFormData] = useState({
        productId: "",
        variantId: "",
        minQty: 1,
        maxQty: "",
        price: "",
    });

    useEffect(() => {
        fetchSlabs();
        fetchProducts();
    }, []);

    useEffect(() => {
        if (products.length > 0) {
            fetchAllVariants();
        }
    }, [products]);

    useEffect(() => {
        if (selectedProductId) {
            // Filter variants for selected product
            fetchVariants(selectedProductId);
        } else {
            // If no product selected, show all variants
            fetchAllVariants();
        }
    }, [selectedProductId]);

    const fetchSlabs = async () => {
        try {
            setIsLoading(true);
            // For now, we'll need to fetch all slabs
            // In a real scenario, you might want pagination
            const response = await api.get("/api/admin/pricing-slabs");
            if (response.data.success) {
                setSlabs(response.data.data || []);
            }
        } catch (error: any) {
            console.error("Error fetching pricing slabs:", error);
            toast.error(t("pricing_slabs.messages.fetch_error"));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await api.get("/api/admin/products?limit=1000");
            if (response.data.success) {
                setProducts(response.data.data?.products || []);
            }
        } catch (error: any) {
            console.error("Error fetching products:", error);
        }
    };

    const fetchAllVariants = async () => {
        try {
            // Fetch all variants by getting all products and extracting variants
            if (products.length > 0) {
                const allVariants: Variant[] = [];
                // Fetch variants for first 50 products to avoid too many requests
                const productsToFetch = products.slice(0, 50);
                for (const product of productsToFetch) {
                    try {
                        const prodResponse = await api.get(`/api/admin/products/${product.id}`);
                        if (prodResponse.data.success) {
                            const productVariants = prodResponse.data.data?.variants || [];
                            // Add product info to each variant
                            const variantsWithProduct = productVariants.map((v: any) => ({
                                ...v,
                                product: product,
                            }));
                            allVariants.push(...variantsWithProduct);
                        }
                    } catch (e) {
                        // Skip this product
                        console.error("Error fetching variants for product:", product.id, e);
                    }
                }
                setVariants(allVariants);
            }
        } catch (error: any) {
            console.error("Error fetching all variants:", error);
        }
    };

    const fetchVariants = async (productId: string) => {
        try {
            const response = await api.get(`/api/admin/products/${productId}`);
            if (response.data.success) {
                const product = response.data.data;
                setVariants(product.variants || []);
            }
        } catch (error: any) {
            console.error("Error fetching variants:", error);
        }
    };

    const handleOpenDialog = (slab?: PricingSlab) => {
        if (slab) {
            setEditingSlab(slab);
            setFormData({
                productId: slab.productId || "",
                variantId: slab.variantId || "",
                minQty: slab.minQty,
                maxQty: slab.maxQty?.toString() || "",
                price: slab.price.toString(),
            });
            if (slab.productId) {
                fetchVariants(slab.productId);
            }
        } else {
            setEditingSlab(null);
            setFormData({
                productId: "",
                variantId: "",
                minQty: 1,
                maxQty: "",
                price: "",
            });
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingSlab(null);
        setFormData({
            productId: "",
            variantId: "",
            minQty: 1,
            maxQty: "",
            price: "",
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.minQty || formData.minQty < 1) {
            toast.error(t("pricing_slabs.validation.min_qty_error"));
            return;
        }

        if (formData.maxQty && parseInt(formData.maxQty) < formData.minQty) {
            toast.error(t("pricing_slabs.validation.max_qty_error"));
            return;
        }

        if (!formData.price || parseFloat(formData.price) <= 0) {
            toast.error(t("pricing_slabs.validation.price_error"));
            return;
        }

        if (!formData.productId && !formData.variantId) {
            toast.error(t("pricing_slabs.validation.product_variant_required"));
            return;
        }

        try {
            const payload = {
                productId: formData.productId || null,
                variantId: formData.variantId || null,
                minQty: formData.minQty,
                maxQty: formData.maxQty ? parseInt(formData.maxQty) : null,
                price: parseFloat(formData.price),
            };

            if (editingSlab) {
                await api.put(`/api/admin/pricing-slabs/${editingSlab.id}`, payload);
                toast.success(t("pricing_slabs.messages.update_success"));
            } else {
                await api.post("/api/admin/pricing-slabs", payload);
                toast.success(t("pricing_slabs.messages.create_success"));
            }

            handleCloseDialog();
            fetchSlabs();
        } catch (error: any) {
            console.error("Error saving pricing slab:", error);
            toast.error(
                error.response?.data?.message || t("pricing_slabs.messages.save_error")
            );
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("pricing_slabs.messages.delete_confirm"))) {
            return;
        }

        try {
            await api.delete(`/api/admin/pricing-slabs/${id}`);
            toast.success(t("pricing_slabs.messages.delete_success"));
            fetchSlabs();
        } catch (error: any) {
            console.error("Error deleting pricing slab:", error);
            toast.error(t("pricing_slabs.messages.delete_error"));
        }
    };

    const getProductName = (slab: PricingSlab) => {
        // Use product data from API response first
        if (slab.product) {
            return slab.product.name;
        }
        // Fallback to products array lookup
        if (!slab.productId) return "N/A";
        const product = products.find((p) => p.id === slab.productId);
        return product?.name || "Unknown Product";
    };

    const getVariantInfo = (slab: PricingSlab) => {
        // Use variant data directly from API response
        if (slab.variant) {
            return `${slab.variant.sku} (${slab.variant.product?.name || "Unknown Product"})`;
        }
        return "N/A";
    };

    const filteredSlabs = slabs.filter((slab) => {
        if (filterType === "product") return slab.productId && !slab.variantId;
        if (filterType === "variant") return slab.variantId;
        return true;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
                        {t('pricing_slabs.title')}
                    </h1>
                    <p className="text-[#9CA3AF] text-sm mt-1.5">
                        {t('pricing_slabs.description')}
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('pricing_slabs.add_button')}
                </Button>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-900">
                                {t('pricing_slabs.info_title')}
                            </p>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>{t('pricing_slabs.info_list.1')}</li>
                                <li>{t('pricing_slabs.info_list.2')}</li>
                                <li>{t('pricing_slabs.info_list.3')}</li>
                                <li>{t('pricing_slabs.info_list.4')}</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filter */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('pricing_slabs.title')}</CardTitle>
                    <CardDescription>
                        {t('pricing_slabs.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t('pricing_slabs.filter_type')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('pricing_slabs.all_slabs')}</SelectItem>
                                <SelectItem value="product">{t('pricing_slabs.product_slabs')}</SelectItem>
                                <SelectItem value="variant">{t('pricing_slabs.variant_slabs')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {filteredSlabs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{t('pricing_slabs.no_slabs')}</p>
                            <p className="text-sm mt-2">{t('pricing_slabs.create_first')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('pricing_slabs.table.type')}</TableHead>
                                    <TableHead>{t('pricing_slabs.table.product_variant')}</TableHead>
                                    <TableHead>{t('pricing_slabs.table.min_qty')}</TableHead>
                                    <TableHead>{t('pricing_slabs.table.max_qty')}</TableHead>
                                    <TableHead>{t('pricing_slabs.table.price')}</TableHead>
                                    <TableHead>{t('pricing_slabs.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSlabs.map((slab) => (
                                    <TableRow key={slab.id}>
                                        <TableCell>
                                            {slab.variantId ? (
                                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                    {t('pricing_slabs.variant')}
                                                </span>
                                            ) : (
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    {t('pricing_slabs.product')}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {slab.variantId
                                                ? getVariantInfo(slab)
                                                : getProductName(slab)}
                                        </TableCell>
                                        <TableCell>{slab.minQty}</TableCell>
                                        <TableCell>{slab.maxQty || "∞"}</TableCell>
                                        <TableCell>₹{parseFloat(slab.price.toString()).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(slab)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(slab.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSlab ? t("pricing_slabs.dialog.edit_title") : t("pricing_slabs.dialog.create_title")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("pricing_slabs.dialog.description")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="product">{t("pricing_slabs.form.product_label")}</Label>
                                    <Select
                                        value={formData.productId || undefined}
                                        onValueChange={(value) => {
                                            setFormData({ ...formData, productId: value, variantId: "" });
                                            setSelectedProductId(value);
                                        }}
                                        disabled={!!formData.variantId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("pricing_slabs.form.product_placeholder")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map((product) => (
                                                <SelectItem key={product.id} value={product.id}>
                                                    {product.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {formData.productId && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setFormData({ ...formData, productId: "", variantId: "" });
                                                setSelectedProductId("");
                                            }}
                                            className="h-6 text-xs"
                                        >
                                            {t("pricing_slabs.form.clear_selection")}
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="variant">{t("pricing_slabs.form.variant_label")}</Label>
                                    <Select
                                        value={formData.variantId || undefined}
                                        onValueChange={(value) => {
                                            setFormData({ ...formData, variantId: value, productId: "" });
                                        }}
                                        disabled={false}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("pricing_slabs.form.variant_placeholder")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {variants.length > 0 ? (
                                                variants.map((variant) => (
                                                    <SelectItem key={variant.id} value={variant.id}>
                                                        {variant.sku} - {(variant as any).product?.name || "Unknown Product"}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="no-variants" disabled>
                                                    {t("pricing_slabs.form.no_variants")}
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {formData.variantId && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setFormData({ ...formData, variantId: "" });
                                            }}
                                            className="h-6 text-xs"
                                        >
                                            {t("pricing_slabs.form.clear_selection")}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="minQty">
                                        {t("pricing_slabs.form.min_qty_label")} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="minQty"
                                        type="number"
                                        min="1"
                                        value={formData.minQty}
                                        onChange={(e) =>
                                            setFormData({ ...formData, minQty: parseInt(e.target.value) || 1 })
                                        }
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="maxQty">{t("pricing_slabs.form.max_qty_label")}</Label>
                                    <Input
                                        id="maxQty"
                                        type="number"
                                        min={formData.minQty + 1}
                                        value={formData.maxQty}
                                        onChange={(e) =>
                                            setFormData({ ...formData, maxQty: e.target.value })
                                        }
                                        placeholder={t("pricing_slabs.form.max_qty_placeholder")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price">
                                        {t("pricing_slabs.form.price_label")} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {(!formData.productId && !formData.variantId) && (
                                <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                    <p className="text-sm text-amber-800">
                                        {t("pricing_slabs.warning.select_product_or_variant")}
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                {t("pricing_slabs.actions.cancel")}
                            </Button>
                            <Button type="submit">
                                {editingSlab ? t("pricing_slabs.actions.update_slab") : t("pricing_slabs.actions.create_slab")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

