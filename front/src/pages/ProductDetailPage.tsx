import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { products } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft,
  Edit,
  Trash2,
  Package,
  Loader2,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";
import { DeleteProductDialog } from "@/components/DeleteProductDialog";
import { useLanguage } from "@/context/LanguageContext";

export default function ProductDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);


  // States for dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await products.getProductById(id);

        if (response.data.success) {
          setProduct(response.data.data.product);
        } else {
          setError(response.data.message || "Failed to fetch product details");
        }
      } catch (error: any) {
        console.error("Error fetching product:", error);
        setError("Failed to load product details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Handle product deletion
  const handleDeleteProduct = async (force: boolean = false) => {
    try {
      setDeletingProduct(true);
      const response = await products.deleteProduct(id as string, force);

      if (response.data.success) {
        // Check if the message indicates the product has orders and cannot be deleted
        if (
          !force &&
          response.data.message?.includes("has associated orders") &&
          response.data.message?.includes("cannot be deleted")
        ) {
          // Show force delete dialog
          setIsForceDeleteDialogOpen(true);
        }
        // If message indicates product is just marked inactive
        else if (
          response.data.message?.includes("cannot be deleted") &&
          response.data.message?.includes("marked as inactive")
        ) {
          toast.success("Product marked as inactive");
          // Update the product status in state
          setProduct({
            ...product,
            isActive: false,
          });
          // Close dialogs if open
          setIsDeleteDialogOpen(false);
          setIsForceDeleteDialogOpen(false);
        } else {
          toast.success("Product deleted successfully");
          navigate("/products");
        }
      } else {
        toast.error(response.data.message || "Failed to delete product");
      }
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(
        error.message || "An error occurred while deleting the product"
      );
    } finally {
      setDeletingProduct(false);
    }
  };

  // Handle marking product as inactive instead of deleting
  const handleMarkAsInactive = async () => {
    if (!id) return;

    try {
      const formData = new FormData();
      formData.append("isActive", "false");

      const response = await products.updateProduct(id, formData as any);

      if (response.data.success) {
        toast.success("Product marked as inactive successfully");

        // Update product status in state
        setProduct({
          ...product,
          isActive: false,
        });

        // Close force delete dialog
        setIsForceDeleteDialogOpen(false);
      } else {
        toast.error(
          response.data.message || "Failed to mark product as inactive"
        );
      }
    } catch (error: any) {
      console.error("Error marking product as inactive:", error);
      toast.error(
        error.message ||
        "An error occurred while marking the product as inactive"
      );
    }
  };

  // Handle toggling product active status
  const handleToggleProductStatus = async () => {
    if (!id) return;

    try {
      const formData = new FormData();
      formData.append("isActive", (!product.isActive).toString());

      const response = await products.updateProduct(id, formData as any);

      if (response.data.success) {
        toast.success(
          product.isActive
            ? "Product deactivated successfully"
            : "Product activated successfully"
        );

        // Update product status in state, including all variants
        const updatedVariants = product.variants.map((variant: any) => ({
          ...variant,
          isActive: !product.isActive,
        }));

        setProduct({
          ...product,
          isActive: !product.isActive,
          variants: updatedVariants,
        });
      } else {
        toast.error(response.data.message || "Failed to update product status");
      }
    } catch (error: any) {
      console.error("Error updating product status:", error);
      toast.error(
        error.message || "An error occurred while updating the product status"
      );
    }
  };

  // Handle edit navigation
  const handleEditProduct = () => {
    navigate(`/products/edit/${id}`);
  };

  // Add a helper function to determine if it's a simple product (before the component)
  const isSimpleProduct = (variants: any[]) => {
    return (
      variants.length === 1 && !variants[0].flavorId && !variants[0].weightId
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-10">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Something went wrong</h2>
        <p className="text-center text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            setError(null);
            setLoading(true);
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // No product found
  if (!product) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-10">
        <AlertTriangle className="h-16 w-16 text-amber-500" />
        <h2 className="mt-4 text-xl font-semibold">{t("products.list.table.no_products")}</h2>
        <p className="text-center text-muted-foreground">
          {t("products.details.not_found_desc") || "The product you're looking for doesn't exist or has been removed."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/products">
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t("products.details.actions.back")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={isDeleteDialogOpen}
        setOpen={setIsDeleteDialogOpen}
        title={t("products.details.dialogs.delete_title")}
        description={t("products.details.dialogs.delete_desc")}
        onConfirm={() => {
          setIsDeleteDialogOpen(false);
          handleDeleteProduct(false);
        }}
        loading={deletingProduct}
        confirmText={t("products.details.actions.delete")}
      />

      {/* Force Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={isForceDeleteDialogOpen}
        setOpen={setIsForceDeleteDialogOpen}
        title={t("products.details.dialogs.force_delete_title")}
        description={t("products.details.dialogs.force_delete_desc")}
        onConfirm={() => {
          setIsForceDeleteDialogOpen(false);
          handleDeleteProduct(true);
        }}
        loading={deletingProduct}
        confirmText={t("products.details.actions.delete")}
        isDestructive={true}
        secondaryAction={{
          text: t("products.details.dialogs.mark_inactive"),
          onClick: handleMarkAsInactive,
        }}
      />

      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/products">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.featured && (
            <Badge variant="secondary" className="ml-2">
              {t("products.form.labels.featured")}
            </Badge>
          )}
          {product.ourProduct && (
            <Badge variant="default" className="ml-2 bg-blue-600">
              {t("products.form.labels.our_product")}
            </Badge>
          )}
          {!product.isActive && (
            <Badge variant="destructive" className="ml-2">
              {t("products.list.status.inactive")}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={handleToggleProductStatus}
          >
            {product.isActive ? t("products.details.actions.deactivate") : t("products.details.actions.activate")}
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleEditProduct}
            className="flex items-center"
          >
            <Edit className="mr-2 h-4 w-4" />
            {t("products.details.actions.edit")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={deletingProduct}
            className="flex items-center"
          >
            {deletingProduct ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.deleting") || "Deleting..."}
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("products.details.actions.delete")}
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">{t("products.details.tabs.details")}</TabsTrigger>
          <TabsTrigger value="variants">{t("products.details.tabs.variants")}</TabsTrigger>

        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("products.form.sections.basic_info")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("products.details.info.categories")}
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {product.categories && product.categories.length > 0 ? (
                    product.categories.map((category: any) => (
                      <Badge
                        key={category.id}
                        variant={category.isPrimary ? "default" : "outline"}
                        className="text-xs"
                      >
                        {category.name}
                        {category.isPrimary && (
                          <span className="ml-1 text-[10px]">(Primary)</span>
                        )}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-base font-medium">Uncategorized</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("products.details.info.status")}
                </h3>
                <p className="text-base font-medium">
                  {product.isActive ? t("products.list.status.active") : t("products.list.status.inactive")}
                </p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("products.details.info.description")}
                </h3>
                <div className="text-base" dangerouslySetInnerHTML={
                  { __html: product.description || "No description provided." }
                } />


              </div>

              {product.nutritionInfo &&
                Object.keys(product.nutritionInfo).length > 0 && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {t("products.details.info.nutrition")}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {Object.entries(product.nutritionInfo).map(
                        ([key, value]: [string, any]) => (
                          <div key={key} className="rounded-md border p-2">
                            <h4 className="text-xs font-medium text-muted-foreground">
                              {key}
                            </h4>
                            <p className="text-sm font-medium">{value}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants" className="space-y-4">
          {product.variants && product.variants.length > 0 ? (
            <>
              {isSimpleProduct(product.variants) ? (
                // Simple product (single variant with no flavor/weight)
                <Card>
                  <CardHeader>
                    <CardTitle>Product Information</CardTitle>
                    <CardDescription>
                      Basic pricing and inventory details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          SKU
                        </h3>
                        <p className="text-base font-medium">
                          {product.variants[0].sku}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Price
                        </h3>
                        <div className="flex items-center gap-2">
                          {product.variants[0].salePrice ? (
                            <>
                              <span className="text-lg font-semibold text-green-600">
                                ₹{product.variants[0].salePrice}
                              </span>
                              <span className="text-sm line-through text-muted-foreground">
                                ₹{product.variants[0].price}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-semibold">
                              ₹{product.variants[0].price}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Stock
                        </h3>
                        <Badge
                          variant={
                            product.variants[0].quantity > 10
                              ? "default"
                              : product.variants[0].quantity > 0
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {product.variants[0].quantity} in stock
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Status
                        </h3>
                        <Badge
                          variant={
                            product.variants[0].isActive
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {product.variants[0].isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // Variable product with multiple variants
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {product.variants.map((variant: any) => (
                    <Card key={variant.id} className="flex flex-col h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {variant.flavor?.name || ""}
                          {variant.flavor?.name &&
                            variant.weight?.value &&
                            " - "}
                          {variant.weight?.value
                            ? `${variant.weight.value}${variant.weight.unit}`
                            : ""}
                        </CardTitle>
                        <CardDescription>SKU: {variant.sku}</CardDescription>
                      </CardHeader>

                      {/* Add variant image display if flavor has an image */}
                      {variant.flavor?.image && (
                        <div className="px-6 py-2">
                          <div className="h-20 w-20 rounded-md overflow-hidden bg-muted">
                            <img
                              src={variant.flavor.image}
                              alt={variant.flavor.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      )}

                      <CardContent className="space-y-2 flex-grow">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Price:
                          </span>
                          <div className="flex items-center">
                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{variant.price}</span>
                          </div>
                        </div>

                        {variant.salePrice && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Sale Price:
                            </span>
                            <div className="flex items-center">
                              <IndianRupee className="h-4 w-4 text-green-500" />
                              <span className="font-medium text-green-500">
                                {variant.salePrice}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Stock:
                          </span>
                          <Badge
                            variant={
                              variant.quantity > 10
                                ? "default"
                                : variant.quantity > 0
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {variant.quantity} in stock
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Status:
                          </span>
                          <Badge
                            variant={
                              variant.isActive ? "secondary" : "destructive"
                            }
                          >
                            {variant.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Package className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-center text-muted-foreground">
                  No variants found for this product.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}
