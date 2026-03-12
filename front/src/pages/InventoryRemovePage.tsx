import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Search,
  MinusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { inventory, products } from "@/api/adminService";

// Enum for removal reasons
enum RemovalReason {
  ADJUSTMENT = "adjustment",
  DAMAGED = "damaged",
  EXPIRED = "expired",
  THEFT = "theft",
  OTHER = "other",
}

export default function InventoryRemovePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [variantsList, setVariantsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedVariantDetails, setSelectedVariantDetails] =
    useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>(RemovalReason.ADJUSTMENT);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Handler to search products
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setError(null);

      const response = await products.getProducts({
        search: searchQuery,
        limit: 20,
      });

      if (response.data.success) {
        setProductsList(response.data.data?.products || []);
        // Reset selections
        setSelectedProduct("");
        setSelectedVariant("");
        setVariantsList([]);
        setSelectedVariantDetails(null);
      } else {
        setError(response.data.message || "Failed to search products");
      }
    } catch (error: any) {
      console.error("Error searching products:", error);
      setError("An error occurred while searching for products");
    } finally {
      setIsSearching(false);
    }
  };

  // Load variants when a product is selected
  useEffect(() => {
    if (!selectedProduct) {
      setVariantsList([]);
      setSelectedVariant("");
      setSelectedVariantDetails(null);
      return;
    }

    const product = productsList.find((p) => p.id === selectedProduct);
    if (product && product.variants) {
      setVariantsList(product.variants);
    }
  }, [selectedProduct, productsList]);

  // Load variant details when a variant is selected
  useEffect(() => {
    if (!selectedVariant) {
      setSelectedVariantDetails(null);
      return;
    }

    const variant = variantsList.find((v) => v.id === selectedVariant);
    if (variant) {
      setSelectedVariantDetails(variant);
      // Don't allow removing more than available
      if (variant.quantity < quantity) {
        setQuantity(variant.quantity > 0 ? variant.quantity : 1);
      }
    }
  }, [selectedVariant, variantsList, quantity]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVariant || quantity <= 0) {
      setError("Please select a product variant and enter a valid quantity");
      return;
    }

    if (selectedVariantDetails && quantity > selectedVariantDetails.quantity) {
      setError(
        `Cannot remove more than the available quantity (${selectedVariantDetails.quantity})`
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await inventory.removeInventory({
        variantId: selectedVariant,
        quantity,
        reason,
        notes: notes.trim() || undefined,
      });

      if (response.data.success) {
        toast.success("Inventory updated successfully");
        navigate("/inventory");
      } else {
        setError(response.data.message || "Failed to update inventory");
      }
    } catch (error: any) {
      console.error("Error updating inventory:", error);
      setError("An error occurred while updating inventory");
    } finally {
      setIsLoading(false);
    }
  };

  // Get variant display name
  const getVariantDisplayName = (variant: any) => {
    const flavorName = variant.flavor?.name || "";
    const weightValue = variant.weight
      ? `${variant.weight.value}${variant.weight.unit}`
      : "";

    if (flavorName && weightValue) {
      return `${flavorName} - ${weightValue} (SKU: ${variant.sku})`;
    } else if (flavorName) {
      return `${flavorName} (SKU: ${variant.sku})`;
    } else if (weightValue) {
      return `${weightValue} (SKU: ${variant.sku})`;
    } else {
      return `SKU: ${variant.sku}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/inventory">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Inventory
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Remove Stock</h1>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Remove Stock from Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products by name, SKU, etc."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                type="button"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>

            {productsList.length > 0 ? (
              <p className="text-sm text-muted-foreground mb-2">
                {productsList.length} products found. Select a product to
                continue.
              </p>
            ) : searchQuery && !isSearching ? (
              <p className="text-sm text-muted-foreground mb-2">
                No products found. Try a different search term.
              </p>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="product">Product</Label>
                <Select
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsList.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="variant">Product Variant</Label>
                <Select
                  value={selectedVariant}
                  onValueChange={setSelectedVariant}
                  disabled={!selectedProduct || variantsList.length === 0}
                >
                  <SelectTrigger id="variant">
                    <SelectValue placeholder="Select a variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {variantsList.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {getVariantDisplayName(variant)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct && variantsList.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No variants available for this product
                  </p>
                )}
              </div>

              {selectedVariantDetails && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p>
                    <strong>Current Stock:</strong>{" "}
                    {selectedVariantDetails.quantity} units
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity to Remove *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedVariantDetails?.quantity || 1}
                  value={quantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (
                      selectedVariantDetails &&
                      value > selectedVariantDetails.quantity
                    ) {
                      setQuantity(selectedVariantDetails.quantity);
                    } else {
                      setQuantity(value);
                    }
                  }}
                  required
                />
                {selectedVariantDetails && (
                  <p className="text-xs text-muted-foreground">
                    Maximum: {selectedVariantDetails.quantity} units
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason">Reason for Removal *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RemovalReason.ADJUSTMENT}>
                      Inventory Adjustment
                    </SelectItem>
                    <SelectItem value={RemovalReason.DAMAGED}>
                      Damaged Items
                    </SelectItem>
                    <SelectItem value={RemovalReason.EXPIRED}>
                      Expired Items
                    </SelectItem>
                    <SelectItem value={RemovalReason.THEFT}>
                      Theft/Loss
                    </SelectItem>
                    <SelectItem value={RemovalReason.OTHER}>
                      Other Reason
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this removal"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/inventory")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  isLoading ||
                  !selectedVariant ||
                  quantity <= 0 ||
                  (selectedVariantDetails &&
                    selectedVariantDetails.quantity === 0)
                }
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MinusCircle className="mr-2 h-4 w-4" />
                )}
                Remove Stock
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
