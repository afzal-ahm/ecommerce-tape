import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { products } from "@/api/adminService";
import {
  Loader2,
  ArrowUpRight,
  Plus,
  Star,
  TrendingUp,
  Zap,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  basePrice?: number;
  regularPrice?: number;
  price?: number;
  salePrice?: number;
  slug?: string;
  isActive?: boolean;
  featured?: boolean;
  productType?: string[];
  categories?: any[];
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  variants?: any[];
  hasVariants?: boolean;
  flavors?: number;
  hasSale?: boolean;
}

const PRODUCT_TYPES = [
  { key: "featured", label: "Featured", icon: Star, color: "bg-yellow-500" },
  {
    key: "bestseller",
    label: "Bestseller",
    icon: TrendingUp,
    color: "bg-green-500",
  },
  { key: "trending", label: "Trending", icon: Zap, color: "bg-purple-500" },
  { key: "new", label: "New Arrivals", icon: Clock, color: "bg-blue-500" },
];

export default function FeaturedProductsPage() {
  const [productsByType, setProductsByType] = useState<
    Record<string, Product[]>
  >({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("featured");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Fetch products for each type
      const typePromises = PRODUCT_TYPES.map(async (type) => {
        try {
          const response = await products.getProductsByType(type.key, 50);
          return {
            type: type.key,
            products: response.data.data.products || [],
          };
        } catch (error) {
          console.error(`Error fetching ${type.key} products:`, error);
          return { type: type.key, products: [] };
        }
      });

      const typeResults = await Promise.all(typePromises);
      const productsByTypeMap: Record<string, Product[]> = {};
      typeResults.forEach(({ type, products }) => {
        productsByTypeMap[type] = products;
      });

      // Fetch all products
      const allResponse = await products.getProducts({
        limit: 100,
        sortBy: "createdAt",
        order: "desc",
      });

      if (allResponse.data.success) {
        setProductsByType(productsByTypeMap);
        setAllProducts(allResponse.data.data.products || []);
      } else {
        setError("Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("An error occurred while fetching products");
    } finally {
      setLoading(false);
    }
  };

  const toggleProductType = async (
    productId: string,
    productType: string,
    isAdding: boolean
  ) => {
    try {
      setUpdateLoading(productId);

      // Get current product to see existing types
      const product = allProducts.find((p) => p.id === productId);
      if (!product) {
        toast.error("Product not found");
        return;
      }

      // Get current product types
      const currentTypes = product.productType || [];
      let newTypes: string[];

      if (isAdding) {
        // Add the new type if not already present
        newTypes = currentTypes.includes(productType)
          ? currentTypes
          : [...currentTypes, productType];
      } else {
        // Remove the type
        newTypes = currentTypes.filter((type) => type !== productType);
      }

      // Create form data
      const formData = new FormData();
      formData.append("productType", JSON.stringify(newTypes));

      // Update product
      const response = await products.updateProduct(productId, formData as any);

      if (response.data.success) {
        toast.success(
          `Product ${isAdding ? "added to" : "removed from"} ${productType}`
        );
        // Refresh product lists
        fetchProducts();
      } else {
        toast.error("Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("An error occurred while updating the product");
    } finally {
      setUpdateLoading(null);
    }
  };

  const getProductImage = (product: Product) => {
    // Priority 1: Direct image field
    if (product.image) return product.image;

    // Priority 2: Product images array
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find((img) => img.isPrimary);
      if (primaryImage) return primaryImage.url;
      return product.images[0].url;
    }

    // Priority 3: Any variant images from any variant
    if (product.variants && product.variants.length > 0) {
      const variantWithImages = product.variants.find(
        (variant) => variant.images && variant.images.length > 0
      );
      if (variantWithImages && variantWithImages.images) {
        const primaryImage = variantWithImages.images.find(
          (img: any) => img.isPrimary
        );
        return primaryImage
          ? primaryImage.url
          : variantWithImages.images[0].url;
      }
    }

    // No image available
    return undefined;
  };

  const getProductPrice = (product: Product) => {
    // For products with explicit basePrice/regularPrice (featured products format)
    if (product.basePrice !== undefined) return product.basePrice;

    // For products with direct price/salePrice
    if (product.salePrice)
      return typeof product.salePrice === "string"
        ? parseFloat(product.salePrice)
        : product.salePrice;
    if (product.price)
      return typeof product.price === "string"
        ? parseFloat(product.price)
        : product.price;

    // For products with variants, calculate minimum price
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map((variant) => {
        if (variant.salePrice)
          return typeof variant.salePrice === "string"
            ? parseFloat(variant.salePrice)
            : variant.salePrice;
        return typeof variant.price === "string"
          ? parseFloat(variant.price)
          : variant.price;
      });
      return Math.min(...prices);
    }

    return 0;
  };

  const getCategoryName = (product: Product) => {
    if (product.category) return product.category.name;
    if (product.categories && product.categories.length > 0)
      return product.categories[0].name;
    return "Uncategorized";
  };

  const getVariantCount = (product: Product) => {
    // If flavors count is explicitly provided
    if (product.flavors !== undefined) return product.flavors;

    // Count variants directly from the array
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }

    // Default case
    return 0;
  };

  const hasProductType = (product: Product, type: string) => {
    return product.productType?.includes(type) || false;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md p-8 border border-red-200 bg-red-50 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Product Categories Management
          </h2>
          <p className="text-muted-foreground">
            Manage products for different categories like Featured, Bestseller,
            Trending, and New Arrivals
          </p>
        </div>
        <Link to="/products/new">
          <Button className="mt-4 md:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            Add New Product
          </Button>
        </Link>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          {PRODUCT_TYPES.map((type) => {
            const IconComponent = type.icon;
            return (
              <TabsTrigger
                key={type.key}
                value={type.key}
                className="flex items-center gap-2"
              >
                <IconComponent className="h-4 w-4" />
                {type.label}
                <Badge variant="secondary" className="ml-1">
                  {productsByType[type.key]?.length || 0}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {PRODUCT_TYPES.map((type) => {
          const IconComponent = type.icon;
          const typeProducts = productsByType[type.key] || [];

          return (
            <TabsContent key={type.key} value={type.key} className="space-y-4">
              {/* Products of this type */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    {type.label} Products
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Products currently marked as {type.label.toLowerCase()}
                  </p>
                </CardHeader>
                <CardContent>
                  {typeProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No {type.label.toLowerCase()} products found. Use the
                      toggle below to add products.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Variants</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>{type.label}</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typeProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                {getProductImage(product) ? (
                                  <img
                                    src={getProductImage(product)}
                                    alt={product.name}
                                    className="h-10 w-10 rounded-md object-contain p-1 bg-white border border-gray-200"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-white border border-gray-200 flex items-center justify-center">
                                    <span className="text-xs text-gray-500">
                                      No img
                                    </span>
                                  </div>
                                )}
                                <span className="max-w-[200px] truncate">
                                  {product.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{getCategoryName(product)}</TableCell>
                            <TableCell>₹{getProductPrice(product)}</TableCell>
                            <TableCell>
                              {getVariantCount(product) > 0 ? (
                                <Badge variant="outline">
                                  {getVariantCount(product)} variants
                                </Badge>
                              ) : (
                                <span>
                                  {product.hasVariants ? "Multiple" : "Simple"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {product.isActive !== false ? (
                                <Badge
                                  variant="default"
                                >
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={hasProductType(product, type.key)}
                                disabled={updateLoading === product.id}
                                onCheckedChange={(checked) =>
                                  toggleProductType(
                                    product.id,
                                    type.key,
                                    checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Link to={`/products/${product.id}`}>
                                <Button variant="ghost" size="sm">
                                  <ArrowUpRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* All Products */}
              <Card>
                <CardHeader>
                  <CardTitle>All Products</CardTitle>
                  <p className="text-muted-foreground">
                    Toggle products to mark them as {type.label.toLowerCase()}
                  </p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Variants</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>{type.label}</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProducts
                        .filter(
                          (p) => !typeProducts.some((tp) => tp.id === p.id)
                        )
                        .map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                {getProductImage(product) ? (
                                  <img
                                    src={getProductImage(product)}
                                    alt={product.name}
                                    className="h-10 w-10 rounded-md object-contain p-1 bg-white border border-gray-200"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-white border border-gray-200 flex items-center justify-center">
                                    <span className="text-xs text-gray-500">
                                      No img
                                    </span>
                                  </div>
                                )}
                                <span className="max-w-[200px] truncate">
                                  {product.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{getCategoryName(product)}</TableCell>
                            <TableCell>₹{getProductPrice(product)}</TableCell>
                            <TableCell>
                              {getVariantCount(product) > 0 ? (
                                <Badge variant="outline">
                                  {getVariantCount(product)} variants
                                </Badge>
                              ) : (
                                <span>
                                  {product.hasVariants ? "Multiple" : "Simple"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {product.isActive !== false ? (
                                <Badge
                                  variant="default"
                                >
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={hasProductType(product, type.key)}
                                disabled={updateLoading === product.id}
                                onCheckedChange={(checked) =>
                                  toggleProductType(
                                    product.id,
                                    type.key,
                                    checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Link to={`/products/${product.id}`}>
                                <Button variant="ghost" size="sm">
                                  <ArrowUpRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
