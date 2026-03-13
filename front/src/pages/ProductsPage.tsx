import {
  useState,
  useEffect,
  useCallback,
  Fragment,
  useRef,
  useMemo,
} from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import {
  products,
  categories,
  subCategories,
  moq,
} from "@/api/adminService";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SafeRender } from "@/components/SafeRender";
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Star,
  X,
  MoreVertical,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DeleteProductDialog } from "@/components/DeleteProductDialog";
import VariantCard from "@/components/VariantCard";
import { useDebounce } from "@/utils/debounce";
import JoditEditor from "jodit-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";


import { useLanguage } from "@/context/LanguageContext";

function useCategories() {
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await categories.getCategories();

        if (response.data.success) {
          setCategoriesData(response.data.data?.categories || []);
        } else {
          setError(response.data.message || "Failed to fetch categories");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setError("An error occurred while fetching categories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories: categoriesData, isLoading, error };
}

// Export ProductForm for reuse in other components
export function ProductForm({
  mode,
  productId,
}: {
  mode: "create" | "edit";
  productId?: string;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(mode === "edit");
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [product, setProduct] = useState({
    name: "",
    description: "",
    categoryId: "",
    categoryIds: [] as string[],
    primaryCategoryId: "",
    subCategoryIds: [] as string[],
    sku: "",
    sellingPrice: "",
    mrp: "",
    quantity: 0,
    featured: false,
    ourProduct: false,
    productType: [] as string[],
    isActive: true,
    // SEO fields
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    tags: [] as string[],
    // single brand association
    brandId: "",
    topBrandIds: [] as string[],
    newBrandIds: [] as string[],
    hotBrandIds: [] as string[],
    // Shipping dimensions for Shiprocket (for products without variants)
    shippingLength: "",
    shippingBreadth: "",
    shippingHeight: "",
    shippingWeight: "",
    redirectUrl: "",
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);

  // State for variants
  const [variants, setVariants] = useState<any[]>([]);

  // MOQ State
  const [productMOQ, setProductMOQ] = useState({
    isActive: false,
    minQuantity: 1,
  });

  // Shiprocket enabled state
  const [shiprocketEnabled, setShiprocketEnabled] = useState(false);

  // Add state to track selected categories
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
  const [subCategoriesMap, setSubCategoriesMap] = useState<
    Record<string, any[]>
  >({});
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(
    []
  );

  // Variant Group State (for linking products as variants)
  const [variantGroupEnabled, setVariantGroupEnabled] = useState(false);
  const [variantGroupType, setVariantGroupType] = useState("Color");
  const [variantGroupProducts, setVariantGroupProducts] = useState<any[]>([]);
  const [variantProductSearch, setVariantProductSearch] = useState("");
  const [variantSearchResults, setVariantSearchResults] = useState<any[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [existingVariantGroupId, setExistingVariantGroupId] = useState<string | null>(null);

  // Get categories data using the useCategories hook
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Fetch Shiprocket settings to check if enabled
  useEffect(() => {
    const fetchShiprocketSettings = async () => {
      try {
        const response = await api.get("/api/admin/shiprocket/settings");
        if (response.data.success) {
          setShiprocketEnabled(response.data.data?.settings?.isEnabled || false);
        }
      } catch (error) {
        // Shiprocket not configured, keep disabled
        console.error("Error fetching shiprocket settings:", error);
        setShiprocketEnabled(false);
      }
    };
    fetchShiprocketSettings();
  }, []);

  // Jodit Editor reference and local state
  const editorRef = useRef<any>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const hasInitializedEditor = useRef(false);

  // Memoize editor config to prevent re-renders when other state changes
  const editorConfig = useMemo(
    () => ({
      height: 400,
      placeholder:
        "Enter product description. Use the toolbar to format text, add tables, colors, and more.",
      toolbar: true,
      toolbarButtonSize: "middle" as const,
      toolbarAdaptive: false,
      showCharsCounter: true,
      showWordsCounter: true,
      showXPathInStatusbar: false,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: "insert_as_html" as const,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "superscript",
        "subscript",
        "|",
        "align",
        "|",
        "ul",
        "ol",
        "|",
        "outdent",
        "indent",
        "|",
        "font",
        "fontsize",
        "brush",
        "paragraph",
        "|",
        "image",
        "link",
        "|",
        "undo",
        "redo",
        "|",
        "hr",
        "eraser",
        "copyformat",
        "|",
        "fullsize",
        "selectall",
        "print",
        "|",
        "source",
        "|",
        "table",
        "|",
        "find",
        "|",
        "symbol",
        "|",
        "about",
      ],
      removeButtons: [],
      zIndex: 0,
      readonly: false,
      activeButtonsInReadOnly: ["source", "fullsize"],
      toolbarSticky: false,
      toolbarStickyOffset: 0,
      showPlaceholder: true,
      language: "en",
      direction: "ltr" as const,
      tabIndex: -1,
      useSearch: true,
      spellcheck: true,
      enter: "p" as const,
      enterBlock: "div" as const,
      defaultMode: 1,
      useSplitMode: false,
      colorPickerDefaultTab: "background" as const,
      imageDefaultWidth: 300,
    }),
    []
  );

  // Fetch sub-categories when categories change
  useEffect(() => {
    const fetchSubCategories = async () => {
      if (product.categoryIds.length === 0) return;

      const subCategoriesData: Record<string, any[]> = {};
      for (const categoryId of product.categoryIds) {
        try {
          const response =
            await subCategories.getSubCategoriesByCategory(categoryId);
          if (response.data?.success) {
            subCategoriesData[categoryId] =
              response.data.data?.subCategories || [];
          }
        } catch (error) {
          console.error(
            `Error fetching sub-categories for category ${categoryId}:`,
            error
          );
        }
      }
      setSubCategoriesMap(subCategoriesData);
    };

    fetchSubCategories();
  }, [product.categoryIds]);

  // Sync editorContent with product.description ONLY when product first loads in edit mode
  // This prevents cursor jumping during typing
  useEffect(() => {
    if (
      mode === "edit" &&
      product.description &&
      !hasInitializedEditor.current
    ) {
      setEditorContent(product.description);
      hasInitializedEditor.current = true;
    }
    if (mode === "create") {
      hasInitializedEditor.current = false;
    }
  }, [mode, product.description]);

  // Define a proper interface for image previews
  interface ImagePreview {
    url: string;
    id?: string;
    isPrimary?: boolean;
  }

  // Handle image drop for upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log(
      `📸 Files dropped/selected: ${acceptedFiles.length}`,
      acceptedFiles
    );

    if (acceptedFiles.length === 0) {
      toast.error("No valid files selected");
      return;
    }

    // Validate files
    const validFiles = acceptedFiles.filter((file) => {
      const isValidType = file.type.startsWith("image/");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

      if (!isValidType) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    // Create local previews for the UI
    const newPreviews = validFiles.map((file) => ({
  url: URL.createObjectURL(file),
  isPrimary: false,
}));

setImagePreviews((prev) => {

  const hasPrimary = prev.some(img => img.isPrimary);

  if (!hasPrimary && prev.length === 0 && newPreviews.length > 0) {
    newPreviews[0].isPrimary = true;
  }

  return [...prev, ...newPreviews];
});

setImageFiles((prev) => [...prev, ...validFiles]);

    toast.success(`${validFiles.length} image(s) added successfully`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/gif": [],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach((file) => {
        const errors = file.errors.map((e) => e.message).join(", ");
        toast.error(`${file.file.name}: ${errors}`);
      });
    },
  });

  // Remove image from preview and files
  const removeImage = (index: number) => {
    // If there's an ID, it's an existing image from the server
    const imageToRemove = imagePreviews[index];

    if (imageToRemove.id) {
      // Check if this is the only image
      if (imagePreviews.length === 1) {
        toast.error(
          "Cannot delete the only image. Products must have at least one image."
        );
        return;
      }

      // This is an existing image, delete from server
      products
        .deleteImage(imageToRemove.id)
        .then(() => {
          toast.success("Image deleted successfully");
          setImagePreviews((prev) => prev.filter((_, i) => i !== index));
        })
        .catch((error) => {
          console.error("Error deleting image:", error);
          if (error.response?.data?.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error("Failed to delete image");
          }
        });
    } else {
      // This is a local preview only
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(imagePreviews[index].url);

      // Remove from both arrays
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
      setImageFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Set an image as primary
 const setPrimaryImage = async (index: number) => {

  const image = imagePreviews[index];

  // UI update
  setImagePreviews((prev) =>
    prev.map((preview, i) => ({
      ...preview,
      isPrimary: i === index,
    }))
  );

  // agar image already server par hai
  if (image.id) {
    try {
      await api.patch(`/api/admin/products/images/${image.id}/set-primary`);

      toast.success("Primary image updated");
    } catch (error) {
      toast.error("Failed to update primary image");
      console.error(error);
    }
  }
};


  // Fetch brands for selection
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await import("@/api/adminService").then((m) =>
          m.brands.getBrands()
        );
        const raw = res.data.data?.brands || res.data.data || [];
        setBrandsList(Array.isArray(raw) ? raw : []);
      } catch (err) {
        console.error("Failed to load brands for product form", err);
      }
    };

    fetchBrands();
  }, []);

  // Fetch product details if in edit mode
  useEffect(() => {
    if (mode === "edit" && productId) {
      const fetchProductDetails = async () => {
        try {
          setFormLoading(true);
          const response = await products.getProductById(productId);

          if (response.data.success) {
            const productData = response.data.data?.product || {};

            // Get categories from the product
            const productCategories = productData.categories || [];
            const primaryCategory =
              productData.primaryCategory ||
              (productCategories.length > 0 ? productCategories[0] : null);

            // Set product data
            const existingSubCategoryIds =
              productData.subCategories?.map((sc: any) => sc.id) || [];

            // Initialize selected sub-categories with existing ones when editing
            setSelectedSubCategories(existingSubCategoryIds);

            // Set editor content for edit mode
            const existingDescription = productData.description || "";
            setEditorContent(existingDescription);

            setProduct({
              name: productData.name || "",
              description: productData.description || "",
              // Prefill brandId if available
              brandId: productData.brand?.id || productData.brandId || "",
              categoryId: primaryCategory?.id || "",
              categoryIds: productCategories.map((c: any) => c.id),
              primaryCategoryId: primaryCategory?.id || "",
              subCategoryIds: existingSubCategoryIds,
              sku:
                productData.variants?.length === 1 &&
                  (!productData.variants[0].attributes ||
                    productData.variants[0].attributes.length === 0)
                  ? productData.variants[0].sku
                  : "",
              sellingPrice:
                productData.variants?.length === 1 &&
                  (!productData.variants[0].attributes ||
                    productData.variants[0].attributes.length === 0)
                  ? (productData.variants[0].salePrice?.toString() || productData.variants[0].price?.toString() || "")
                  : "",
              mrp:
                productData.variants?.length === 1 &&
                  (!productData.variants[0].attributes ||
                    productData.variants[0].attributes.length === 0) &&
                  productData.variants[0].salePrice !== null &&
                  productData.variants[0].salePrice !== undefined
                  ? productData.variants[0].price?.toString() || ""
                  : "",
              redirectUrl: productData.redirectUrl || "",
              quantity:
                productData.variants?.length === 1 &&
                  (!productData.variants[0].attributes || productData.variants[0].attributes.length === 0)
                  ? productData.variants[0].quantity
                  : 0,
              featured: productData.featured || false,
              ourProduct: productData.ourProduct || false,
              productType: Array.isArray(productData.productType)
                ? productData.productType
                : typeof productData.productType === "string"
                  ? (() => {
                    try {
                      const parsed = JSON.parse(productData.productType);
                      return Array.isArray(parsed) ? parsed : [];
                    } catch {
                      return [];
                    }
                  })()
                  : [],
              isActive:
                productData.isActive !== undefined
                  ? productData.isActive
                  : true,
              // SEO fields
              metaTitle: productData.metaTitle || "",
              metaDescription: productData.metaDescription || "",
              keywords: productData.keywords || "",
              tags: productData.tags || [],
              topBrandIds: productData.topBrandIds || [],
              newBrandIds: productData.newBrandIds || [],
              hotBrandIds: productData.hotBrandIds || [],
              // Shipping dimensions (from first variant if no variants)
              shippingLength: productData.variants?.[0]?.shippingLength?.toString() || "",
              shippingBreadth: productData.variants?.[0]?.shippingBreadth?.toString() || "",
              shippingHeight: productData.variants?.[0]?.shippingHeight?.toString() || "",
              shippingWeight: productData.variants?.[0]?.shippingWeight?.toString() || "",
            });

            // Set selected categories (for radio buttons, not checkboxes)
            setSelectedCategories(productCategories);

            // Setup image previews
            if (productData.images && productData.images.length > 0) {
              setImagePreviews(
                productData.images.map((img: any) => ({
                  url: img.url,
                  id: img.id,
                  isPrimary: img.isPrimary || false,
                }))
              );
            }

            if (productData.variants && productData.variants.length > 0) {
              const hasRealVariants =
                productData.variants.length > 1 ||
                (productData.variants.length === 1 &&
                  productData.variants[0].attributes?.length > 0);

              setHasVariants(hasRealVariants);

              if (hasRealVariants) {
                // Map the backend variants to the format expected by the form
                const formattedVariants = productData.variants.map(
                  (variant: any) => ({
                    id: variant.id,
                    attributeValueIds: variant.attributes
                      ? variant.attributes.map((a: any) => a.attributeValueId)
                      : [],
                    attributes: variant.attributes || [],
                    sku: variant.sku || "",
                    sellingPrice: variant.salePrice
                      ? variant.salePrice.toString()
                      : variant.price?.toString() || "0.00",
                    mrp: variant.salePrice
                      ? variant.price?.toString() || ""
                      : "",
                    quantity: variant.quantity || 0,
                    isActive:
                      variant.isActive !== undefined ? variant.isActive : true,
                    images: Array.isArray(variant.images)
                      ? variant.images.map((img: any) => ({
                        url: img.url,
                        id: img.id,
                        isPrimary: img.isPrimary || false,
                        isNew: false,
                      }))
                      : [],
                  })
                );

                setVariants(formattedVariants);

              }
            }
            // Fetch existing variant group if any
            try {
              const vgResponse = await api.get(`/api/admin/variants`);
              if (vgResponse.data.success) {
                // Find group that contains this product
                // Actually we should filter groups that have this product as a member
                // For now, let's fetch by product id if we had a better endpoint, 
                // but let's assume we find it in the list.
                // Better approach: the backend should include variantGroup on the product.
                // Let's check if productData has variantGroup
              }
            } catch (err) {
              console.error("Error fetching variant groups:", err);
            }

            // Since we don't have a direct "get group for product" endpoint yet, 
            // let's look at the productData itself.
            if (productData.variantGroup) {
              setVariantGroupEnabled(true);
              setExistingVariantGroupId(productData.variantGroup.id);
              setVariantGroupType(productData.variantGroup.type || "Color");

              // Map items to variantGroupProducts format
              if (productData.variantGroup.items) {
                const linkedProducts = productData.variantGroup.items
                  .filter((item: any) => item.productId !== productId)
                  .map((item: any) => ({
                    id: item.product?.id || item.productId,
                    name: item.product?.name || "Unknown Product",
                    label: item.label,
                    images: item.product?.images || [],
                  }));
                setVariantGroupProducts(linkedProducts);
              }
            } else {
              // Alternative: Search all groups for this product
              try {
                const groupsRes = await api.get("/api/admin/variants");
                if (groupsRes.data.success) {
                  // A product can be in only one variant group based on schema (usually)
                  // Let's find one that contains this productId
                  // We need detailed groups for this.
                  // For now, let's assume the simplified check above works if variantGroup is included in product.
                }
              } catch (e) { }
            }
          } else {
            toast.error(
              response.data.message || "Failed to fetch product details"
            );
          }
        } catch (error) {
          console.error("Error fetching product:", error);
          toast.error("An error occurred while fetching product data");
        } finally {
          setFormLoading(false);
        }
      };

      fetchProductDetails();

      // Fetch Product MOQ
      if (mode === "edit" && productId) {
        moq.getProductMOQ(productId)
          .then((response) => {
            if (response.data.success && response.data.data) {
              setProductMOQ({
                isActive: response.data.data.isActive,
                minQuantity: response.data.data.minQuantity,
              });
            }
          })
          .catch(() => {
            // MOQ not set, that's okay
          });
      }
    }
  }, [mode, productId]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setProduct((prev) => ({ ...prev, [name]: checked }));
    } else {
      setProduct((prev) => ({ ...prev, [name]: value }));
    }
  };


  // Handle variant images change (used by VariantCard)
  const handleVariantImagesChange = (variantIndex: number, images: any[]) => {
    setVariants((prev) =>
      prev.map((variant, i) =>
        i === variantIndex ? { ...variant, images } : variant
      )
    );
  };

  // Update variant by index (used by VariantCard)
  const updateVariantByIndex = (
    variantIndex: number,
    field: string,
    value: any
  ) => {
    setVariants((prev) =>
      prev.map((variant, i) =>
        i === variantIndex ? { ...variant, [field]: value } : variant
      )
    );
  };

  // Remove variant by index (used by VariantCard)
  const removeVariantByIndex = (variantIndex: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== variantIndex));
  };



  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate product name
    if (!product.name || product.name.trim() === "") {
      toast.error("Please provide a valid product name");
      setIsLoading(false);
      return;
    }

    // Validate category selection
    if (!product.categoryIds || product.categoryIds.length === 0) {
      toast.error("Please select at least one category");
      setIsLoading(false);
      return;
    }

    // Validate variants for variant products
    if (hasVariants && (!variants || variants.length === 0)) {
      toast.error("Please add at least one variant for this product");
      setIsLoading(false);
      return;
    }

    try {
      // Create FormData object for API submission
      const formData = new FormData();

      // Add basic product information
      formData.append("name", product.name);
      // Use editorContent if available, otherwise use product.description
      // Get the latest content - prioritize editorContent as it's the most up-to-date
      let finalDescription = "";

      // First try editorContent (most recent)
      if (editorContent && editorContent.trim()) {
        finalDescription = editorContent.trim();
      }
      // Fallback to product.description
      else if (product.description && product.description.trim()) {
        finalDescription = product.description.trim();
      }

      // Try to get from editor ref as last resort
      if (!finalDescription && editorRef.current) {
        try {
          const editorValue =
            (editorRef.current as any).value ||
            (editorRef.current as any).getEditorValue?.();
          if (
            editorValue &&
            typeof editorValue === "string" &&
            editorValue.trim()
          ) {
            finalDescription = editorValue.trim();
          }
        } catch (e) {
          console.warn("Could not get editor value from ref", e);
        }
      }

      formData.append("description", finalDescription);
      formData.append("featured", String(product.featured));
      formData.append("ourProduct", String(product.ourProduct));
      formData.append("productType", JSON.stringify(product.productType));
      formData.append("isActive", String(product.isActive));
      formData.append("hasVariants", String(hasVariants));
      // Add SEO fields
      formData.append("metaTitle", product.metaTitle || "");
      // Auto-generate meta description from description if not provided
      let metaDesc = product.metaDescription || "";
      if (!metaDesc || metaDesc.trim() === "") {
        // Strip HTML tags and create plain text version
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = product.description || "";
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        metaDesc = plainText.replace(/\s+/g, " ").trim().substring(0, 160);
        if (plainText.length > 160) {
          metaDesc += "...";
        }
      }
      formData.append("metaDescription", metaDesc);
      formData.append("keywords", product.keywords || "");
      formData.append("tags", JSON.stringify(product.tags || []));

      // Add categories information
      if (product.categoryIds && product.categoryIds.length > 0) {
        formData.append("categoryIds", JSON.stringify(product.categoryIds));
        if (product.primaryCategoryId) {
          formData.append("primaryCategoryId", product.primaryCategoryId);
        }
      }
      // Add sub-categories information
      if (selectedSubCategories.length > 0) {
        formData.append(
          "subCategoryIds",
          JSON.stringify(selectedSubCategories)
        );
      }

      // Add simple product data if no variants
      if (!hasVariants) {
        // Add simple product data
        // Pricing Logic:
        // Backend `price` = Regular Price (MRP)
        // Backend `salePrice` = Discounted Price (Selling Price)

        const sellingPriceVal = parseFloat(product.sellingPrice || "0");
        const mrpVal = parseFloat(product.mrp || "0");

        if (product.mrp && mrpVal > sellingPriceVal) {
          // Case: On Sale (MRP > Selling)
          formData.append("price", String(mrpVal)); // Backend Price = MRP
          formData.append("salePrice", String(sellingPriceVal)); // Backend Sale Price = Selling
        } else {
          // Case: No Sale
          formData.append("price", String(sellingPriceVal || 0)); // Backend Price = Selling
          formData.append("salePrice", ""); // No Sale Price
        }
        formData.append("quantity", String(product.quantity || 0));
        // Add SKU for simple products
        if (product.sku && product.sku.trim() !== "") {
          formData.append("sku", product.sku);
        }

        // Add shipping dimensions for simple product
        if (shiprocketEnabled) {
          if (product.shippingLength) formData.append("shippingLength", product.shippingLength);
          if (product.shippingBreadth) formData.append("shippingBreadth", product.shippingBreadth);
          if (product.shippingHeight) formData.append("shippingHeight", product.shippingHeight);
          if (product.shippingWeight) formData.append("shippingWeight", product.shippingWeight);
        }

        // Add redirectUrl for simple product
        if (product.redirectUrl) {
          formData.append("redirectUrl", product.redirectUrl);
        }

        // Ensure pricing slabs for simple products are sent if state variable exists
        try {
          // We check if pricingSlabs state exists in scope (it might be defined but not visible in snippet)
          // If not found, we skip it (assuming feature not fully implemented for simple products yet)
          // But we MUST send MOQ settings
        } catch (e) {
          console.error("Error adding pricing slabs to form data:", e);
        }
      }

      // Add Product Level MOQ Settings
      // This applies to Simple Products directly, and as product-level fallback for Variable Products
      if (productMOQ) {
        formData.append("moqSettings", JSON.stringify(productMOQ));
      }

      // Add variants if product has variants
      if (hasVariants && variants.length > 0) {
        // Ensure all required fields are in each variant
        const processedVariants = variants.map((variant) => {
          return {
            id: variant.id,
            attributeValueIds: variant.attributeValueIds || [],
            sku: variant.sku || "",
            // Pricing Logic Swap for Backend
            // Frontend `sellingPrice` = Actual Price, `mrp` = MRP
            // Backend `price` = MRP (Regular), `salePrice` = Selling (Discounted)
            price: (() => {
              const selling = parseFloat(variant.sellingPrice || "0");
              const mrp = parseFloat(variant.mrp || "0");
              if (variant.mrp && mrp > selling) return String(mrp);
              return String(selling);
            })(),
            salePrice: (() => {
              const selling = parseFloat(variant.sellingPrice || "0");
              const mrp = parseFloat(variant.mrp || "0");
              if (variant.mrp && mrp > selling) return String(selling);
              return "";
            })(),
            quantity: String(variant.quantity || 0),
            isActive: variant.isActive !== undefined ? variant.isActive : true,
            removedImageIds: variant.removedImageIds || [], // Include removed image IDs for cleanup

            // Include Shipping, MOQ, and Pricing Slabs
            shippingLength: variant.shippingLength,
            shippingBreadth: variant.shippingBreadth,
            shippingHeight: variant.shippingHeight,
            shippingWeight: variant.shippingWeight,
            moq: variant.moq,
            pricingSlabs: variant.pricingSlabs,
            redirectUrl: variant.redirectUrl || "",
          };
        });

        formData.append("variants", JSON.stringify(processedVariants));
      }

      // Add images (only for non-variant products)
      if (!hasVariants && imageFiles.length > 0) {
        console.log(
          `📸 Submitting ${imageFiles.length} images for simple product:`,
          imageFiles
        );

        // Add primary image index
        const primaryIndex = imagePreviews.findIndex(
          (img) => img.isPrimary === true
        );
        if (primaryIndex >= 0) {
          formData.append("primaryImageIndex", String(primaryIndex));
          console.log(`📸 Primary image index: ${primaryIndex}`);
        } else {
          // Default to first image as primary if none is marked
          formData.append("primaryImageIndex", "0");
          console.log(`📸 Default primary image index: 0`);
        }

        // Append each image file with proper field name for multer
        imageFiles.forEach((file, index) => {
          formData.append("images", file);
          console.log(
            `📸 Added image ${index + 1}: ${file.name} (${file.size} bytes)`
          );
        });

        // Also log the FormData contents
        console.log(
          `📸 FormData contents:`,
          Object.fromEntries(formData.entries())
        );
      } else if (hasVariants) {
        console.log(
          `📸 Skipping product images for variant product - will use variant-specific images`
        );
      }

      // Add topBrandIds, newBrandIds, hotBrandIds to formData
      // Include single brand association if set
      if ((product as any).brandId) {
        formData.append("brandId", (product as any).brandId);
      }
      formData.append("topBrandIds", JSON.stringify(product.topBrandIds || []));
      formData.append("newBrandIds", JSON.stringify(product.newBrandIds || []));
      formData.append("hotBrandIds", JSON.stringify(product.hotBrandIds || []));

      let response;
      let savedProductId = productId;
      if (mode === "create") {
        response = await products.createProduct(formData as any);
        if (response.data.success) {
          savedProductId = response.data.data?.product?.id;
        }
      } else {
        response = await products.updateProduct(productId!, formData as any);
      }

      if (response.data.success) {
        // If product creation/update was successful and we have variant images, upload them
        if (hasVariants && response.data.data?.product?.variants) {
          const productVariants = response.data.data.product.variants;
          console.log(
            `📸 Processing variant images for ${productVariants.length} variants`
          );

          const uploadPromises = [];

          // Match variants by their temporary IDs or color/size combination
          for (let i = 0; i < variants.length; i++) {
            const localVariant = variants[i];

            // In create mode: match by index
            // In edit mode: match by ID or create new mapping for newly generated variants
            let serverVariant;

            if (mode === "create") {
              serverVariant = productVariants[i]; // Match by index since they're created in same order
            } else {
              // Edit mode: find matching variant by ID or create new one
              const isNewVariant =
                localVariant.id && localVariant.id.includes("-"); // UUID format

              if (isNewVariant) {
                // This is a newly generated variant, find it in the updated product variants
                // Match by color/size combination
                serverVariant = productVariants.find(
                  (sv: any) =>
                    sv.colorId === localVariant.colorId &&
                    sv.sizeId === localVariant.sizeId
                );
              } else {
                // This is an existing variant, find by ID
                serverVariant = productVariants.find(
                  (sv: any) => sv.id === localVariant.id
                );
              }
            }

            if (localVariant && localVariant.images && serverVariant) {
              // Filter only new images that need to be uploaded
              const newImages = localVariant.images.filter(
                (img: any) => img.isNew && img.file
              );

              if (newImages.length > 0) {
                console.log(
                  `📸 Found ${newImages.length} new images for variant ${serverVariant.id} (${localVariant.color?.name || "N/A"} - ${localVariant.size?.name || "N/A"}) [Mode: ${mode}]`
                );

                // Upload each new image for this variant
                for (let j = 0; j < newImages.length; j++) {
                  const imageData = newImages[j];

                  // FIXED: Send undefined for non-explicitly-marked images to let backend decide
                  // Only send true/false when explicitly set, otherwise let backend handle it
                  const isPrimary =
                    imageData.isPrimary === true ? true : undefined;

                  console.log(`📸 Upload decision for image ${j + 1}:`, {
                    imageDataIsPrimary: imageData.isPrimary,
                    finalIsPrimary: isPrimary,
                    note: "undefined = let backend decide, true = force primary",
                  });

                  const uploadPromise = products
                    .uploadVariantImage(
                      serverVariant.id,
                      imageData.file,
                      isPrimary
                    )
                    .then(() => {
                      console.log(
                        `📸 Uploaded image ${j + 1}/${newImages.length} for variant ${serverVariant.id} (isPrimary: ${isPrimary})`
                      );
                    })
                    .catch((error) => {
                      console.error(
                        `❌ Failed to upload image ${j + 1} for variant ${serverVariant.id}:`,
                        error
                      );
                      throw error;
                    });

                  uploadPromises.push(uploadPromise);
                }
              }
            }
          }

          // Wait for all uploads to complete
          if (uploadPromises.length > 0) {
            try {
              await Promise.all(uploadPromises);
              toast.success(
                `Successfully uploaded ${uploadPromises.length} variant image(s)`
              );
            } catch (error) {
              console.error("Some variant image uploads failed:", error);
              toast.error("Failed to upload some variant images");
            }
          }

          // Save Variant MOQ settings
          if (response.data.data?.product?.variants) {
            const productVariants = response.data.data.product.variants;
            for (let i = 0; i < variants.length; i++) {
              const localVariant = variants[i];
              if (localVariant.moq) {
                // Find matching server variant
                let serverVariant;
                if (mode === "create") {
                  serverVariant = productVariants[i];
                } else {
                  serverVariant = productVariants.find(
                    (sv: any) => sv.id === localVariant.id
                  );
                }

                if (serverVariant && serverVariant.id) {
                  try {
                    if (localVariant.moq.isActive) {
                      await moq.setVariantMOQ(serverVariant.id, {
                        minQuantity: localVariant.moq.minQuantity,
                        isActive: true,
                      });
                    } else {
                      await moq.deleteVariantMOQ(serverVariant.id);
                    }
                  } catch (error: any) {
                    console.error(`Error saving MOQ for variant ${serverVariant.id}:`, error);
                  }
                }
              }
            }
          }
        }

        // Save Product MOQ
        if (savedProductId) {
          try {
            if (productMOQ.isActive) {
              await moq.setProductMOQ(savedProductId, {
                minQuantity: productMOQ.minQuantity,
                isActive: true,
              });
            } else {
              // Delete MOQ if disabled
              await moq.deleteProductMOQ(savedProductId);
            }
          } catch (error: any) {
            console.error("Error saving MOQ:", error);
            // Don't fail the whole operation if MOQ save fails
            toast.error("Product saved but MOQ settings failed to update");
          }
        }

        // Save Variant Group if enabled
        if (savedProductId && variantGroupEnabled) {
          try {
            const payload = {
              name: `${product.name} Variant Group`,
              type: variantGroupType,
              products: [
                // Current product
                {
                  productId: savedProductId,
                  label: product.name, // Will be overridden or set as default
                  order: 0,
                  isDefault: true
                },
                // Other products
                ...variantGroupProducts.map((p, index) => ({
                  productId: p.id,
                  label: p.label || p.name,
                  order: index + 1,
                  isDefault: false
                }))
              ]
            };

            if (existingVariantGroupId) {
              await api.put(`/api/admin/variants/${existingVariantGroupId}`, payload);
            } else {
              await api.post(`/api/admin/variants`, payload);
            }
          } catch (vgError: any) {
            console.error("Error saving variant group:", vgError);
            toast.error("Product saved but variant group failed to update");
          }
        } else if (savedProductId && !variantGroupEnabled && existingVariantGroupId) {
          // If it was enabled but now disabled, maybe delete the group?
          // Or at least remove this product from it. 
          // For now, let's keep it simple.
          try {
            await api.delete(`/api/admin/variants/${existingVariantGroupId}`);
          } catch (e) { }
        }

        toast.success(
          mode === "create"
            ? "Product created successfully"
            : "Product updated successfully"
        );
        navigate("/products");
      } else {
        toast.error(response.data.message || "Failed to save product");
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to save product";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  const handleSelectCategory = (categoryId: string) => {
    // Check if the category is already selected
    const isSelected = product.categoryIds.includes(categoryId);

    // Get parent-child relationships
    const parentChildMap = new Map();
    const childParentMap = new Map();

    categories.forEach((category) => {
      if (category.children && category.children.length > 0) {
        parentChildMap.set(
          category.id,
          category.children.map((child: any) => child.id)
        );
      }
      if (category.parentId) {
        childParentMap.set(category.id, category.parentId);
      }
    });

    // Helper functions
    const isParent = (id: string) => parentChildMap.has(id);
    const isChild = (id: string) => childParentMap.has(id);
    const getParentId = (id: string) => childParentMap.get(id);
    const getChildrenIds = (id: string) => parentChildMap.get(id) || [];

    let newSelectedCategoryIds: string[] = [...product.categoryIds];

    if (isSelected) {
      // If selected, remove it from the array
      newSelectedCategoryIds = newSelectedCategoryIds.filter(
        (id) => id !== categoryId
      );

      // If this is a parent, also remove all its children
      if (isParent(categoryId)) {
        const childrenIds = getChildrenIds(categoryId);
        newSelectedCategoryIds = newSelectedCategoryIds.filter(
          (id) => !childrenIds.includes(id)
        );
      }
    } else {
      // If not selected, add it to the array
      newSelectedCategoryIds.push(categoryId);

      // If this is a child, also select its parent if not already selected
      if (isChild(categoryId)) {
        const parentId = getParentId(categoryId);
        if (parentId && !newSelectedCategoryIds.includes(parentId)) {
          newSelectedCategoryIds.push(parentId);
        }
      }
    }

    // Update primary category if needed
    if (product.primaryCategoryId === categoryId && isSelected) {
      // If removing the primary category, set a new primary if possible
      if (newSelectedCategoryIds.length > 0) {
        setProduct((prev) => ({
          ...prev,
          primaryCategoryId: newSelectedCategoryIds[0],
        }));
      } else {
        // If no categories left, clear primary category
        setProduct((prev) => ({
          ...prev,
          primaryCategoryId: "", // Use empty string instead of null
        }));
      }
    } else if (
      !product.primaryCategoryId &&
      newSelectedCategoryIds.length > 0
    ) {
      // If this is the first category, set it as primary
      setProduct((prev) => ({
        ...prev,
        primaryCategoryId: newSelectedCategoryIds[0],
      }));
    }

    // Update the product with new category IDs
    setProduct((prev) => ({
      ...prev,
      categoryIds: newSelectedCategoryIds,
    }));
  };

  // Handle setting primary category
  const handleSetPrimaryCategory = (categoryId: string) => {
    // Update product with new primary category
    setProduct((prev) => ({
      ...prev,
      primaryCategoryId: categoryId,
    }));

    // Also update selectedCategories to reflect the primary category change
    setSelectedCategories((prev) =>
      prev.map((category) => ({
        ...category,
        isPrimary: category.id === categoryId,
      }))
    );
  };

  // State for product linking UX
  const [showProductLinker, setShowProductLinker] = useState(false);

  // Search for products to add to variant group
  const searchProductsForVariant = async (query: string) => {
    if (!query || query.length < 2) {
      setVariantSearchResults([]);
      return;
    }
    setIsSearchingProducts(true);
    try {
      const response = await api.get(`/api/admin/products?search=${encodeURIComponent(query)}&limit=10`);
      if (response.data.success) {
        // Filter out current product and already selected products
        const results = (response.data.data?.products || []).filter(
          (p: any) =>
            p.id !== productId &&
            !variantGroupProducts.some((vp) => vp.id === p.id)
        );
        setVariantSearchResults(results);
      }
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  // Add product to variant group
  const addProductToVariantGroup = (product: any) => {
    setVariantGroupProducts((prev) => [
      ...prev,
      {
        ...product,
        label: product.name,
        isDefault: prev.length === 0 // First product is default
      }
    ]);
    setVariantProductSearch("");
    setVariantSearchResults([]);
  };

  // Remove product from variant group
  const removeProductFromVariantGroup = (productId: string) => {
    setVariantGroupProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Debounced search effect
  const debouncedVariantSearch = useDebounce(variantProductSearch, 300);
  useEffect(() => {
    if (debouncedVariantSearch) {
      searchProductsForVariant(debouncedVariantSearch);
    } else {
      setVariantSearchResults([]);
    }
  }, [debouncedVariantSearch]);


  /* 
  useEffect(() => {
    // Auto-generate SKU when not using variants and SKU hasn't been manually edited
    if (
      !hasVariants &&
      product.name &&
      product.price &&
      categories.length > 0 &&
      product.categoryIds.length > 0
    ) {
      const categoryName =
        categories.find((c) => c.id === product.categoryIds[0])?.name || "";
      // Create SKU from first 3 chars of name + price + first 3 chars of category
      const namePart = product.name
        .replace(/\s+/g, "")
        .substring(0, 3)
        .toUpperCase();
      const pricePart = Math.floor(parseFloat(product.price)).toString();
      const categoryPart = categoryName
        .replace(/\s+/g, "")
        .substring(0, 3)
        .toUpperCase();

      const generatedSku = `${namePart}${pricePart}${categoryPart}`;

      setProduct((prev) => ({
        ...prev,
        sku: generatedSku,
      }));
    }
  }, [
    hasVariants,
    product.name,
    product.price,
    product.categoryIds,
    categories,
  ]);
  */

  //         m.brands.getBrands()
  //       );
  //       const brandOptions = (res.data.data.brands || []).map((b: any) => ({
  //         label: b.name,
  //         value: b.id,
  //       }));
  //       setBrands(brandOptions);
  //     } catch (e) {
  //       // ignore
  //     }
  //   }
  //   fetchBrands();
  // }, []);

  if (formLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            {mode === "edit" ? "Loading product..." : "Preparing form..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/products">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {mode === "create"
              ? t("products.add_new")
              : `${t("products.edit_product")}: ${product.name}`}
          </h1>
        </div>
      </div>

      <Card className="overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-8 p-6">
          {/* Basic Information */}
          <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
            <h2 className="text-xl font-semibold border-b pb-2">
              {t("products.form.sections.basic_info")}
            </h2>

            <div className="space-y-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("products.form.labels.name")} *</Label>
                <Input
                  id="name"
                  name="name"
                  value={product.name}
                  onChange={handleChange}
                  placeholder={t("products.form.placeholders.enter_name")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categories">{t("products.form.labels.category")} *</Label>
                <CategorySelector
                  selectedCategoryIds={product.categoryIds}
                  onSelectCategory={handleSelectCategory}
                  primaryCategoryId={product.primaryCategoryId}
                  onSetPrimaryCategory={handleSetPrimaryCategory}
                  categories={categories}
                  isLoading={categoriesLoading}
                />
              </div>

              {/* Primary Category Selection - only show if multiple categories selected */}
              {product.categoryIds.length > 1 && (
                <div className="space-y-2">
                  <Label>{t("products.form.categories.primary_category")} *</Label>
                  <div className="space-y-2 rounded-md border p-3">
                    {selectedCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="radio"
                          id={`primary-${category.id}`}
                          name="primaryCategory"
                          value={category.id}
                          checked={product.primaryCategoryId === category.id}
                          onChange={() => handleSetPrimaryCategory(category.id)}
                          className="h-4 w-4 rounded-full border-gray-300"
                        />
                        <label
                          htmlFor={`primary-${category.id}`}
                          className="text-sm"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The primary category determines where the product appears in
                    main listings
                  </p>
                </div>
              )}

              {/* Sub-Categories Selection */}
              {product.categoryIds.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="subCategories">
                    {t("products.form.categories.sub_categories_optional")}
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("products.form.categories.select_sub_categories_hint")}
                  </p>
                  <div className="space-y-3 rounded-md border p-4 bg-muted/30">
                    {product.categoryIds.map((categoryId) => {
                      const category = categories.find(
                        (c) => c.id === categoryId
                      );
                      const subCats = subCategoriesMap[categoryId] || [];
                      if (subCats.length === 0) return null;

                      return (
                        <div
                          key={categoryId}
                          className="space-y-2 p-3 bg-background rounded-md border"
                        >
                          <p className="text-sm font-semibold text-primary">
                            {category?.name || "Category"} {t("products.form.categories.sub_categories_label")}:
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2">
                            {subCats.map((subCat: any) => (
                              <label
                                key={subCat.id}
                                className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-muted transition-colors border border-transparent hover:border-primary/20"
                              >
                                <Checkbox
                                  checked={selectedSubCategories.includes(
                                    subCat.id
                                  )}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedSubCategories([
                                        ...selectedSubCategories,
                                        subCat.id,
                                      ]);
                                    } else {
                                      setSelectedSubCategories(
                                        selectedSubCategories.filter(
                                          (id) => id !== subCat.id
                                        )
                                      );
                                    }
                                  }}
                                />
                                <span className="text-sm font-medium">
                                  {subCat.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {Object.values(subCategoriesMap).flat().length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">
                          {t("products.form.categories.no_sub_categories")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You can create sub-categories from the{" "}
                          <Link
                            to="/categories"
                            className="text-primary hover:underline"
                          >
                            Categories page
                          </Link>
                          .
                        </p>
                      </div>
                    )}
                    {selectedSubCategories.length > 0 && (
                      <div className="mt-4 p-3 bg-primary/10 rounded-md border border-primary/20">
                        <p className="text-sm font-medium mb-2">
                          {t("products.form.categories.selected_sub_categories")} (
                          {selectedSubCategories.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedSubCategories.map((subCatId) => {
                            // Find the sub-category name
                            let subCatName = "";
                            for (const subCats of Object.values(
                              subCategoriesMap
                            )) {
                              const found = subCats.find(
                                (sc: any) => sc.id === subCatId
                              );
                              if (found) {
                                subCatName = found.name;
                                break;
                              }
                            }
                            return (
                              <Badge
                                key={subCatId}
                                variant="default"
                                className="text-xs"
                              >
                                {subCatName || subCatId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">{t("products.form.labels.description")}</Label>
                <div className="border rounded-md overflow-hidden">
                  <JoditEditor
                    ref={editorRef}
                    value={editorContent}
                    config={editorConfig}
                    onBlur={(content: string) => {
                      // Only update if content actually changed
                      if (content !== editorContent) {
                        setEditorContent(content);
                        setProduct((prev) => ({
                          ...prev,
                          description: content,
                        }));
                      }

                      // Auto-generate meta description if not provided
                      if (
                        !product.metaDescription ||
                        product.metaDescription.trim() === ""
                      ) {
                        // Strip HTML tags and create plain text version
                        const tempDiv = document.createElement("div");
                        tempDiv.innerHTML = content;
                        const plainText =
                          tempDiv.textContent || tempDiv.innerText || "";
                        const metaDesc = plainText
                          .replace(/\s+/g, " ")
                          .trim()
                          .substring(0, 160);
                        if (plainText.length > 160) {
                          setProduct((prev) => ({
                            ...prev,
                            metaDescription: metaDesc + "...",
                          }));
                        } else if (metaDesc) {
                          setProduct((prev) => ({
                            ...prev,
                            metaDescription: metaDesc,
                          }));
                        }
                      }
                    }}
                    onChange={(content: string) => {
                      // Only update product.description for form submission
                      // DON'T update editorContent here to prevent cursor jumping
                      // editorContent is only updated on initial load and onBlur
                      setProduct((prev) => ({ ...prev, description: content }));
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the toolbar to format your description. Supports rich text
                  formatting, tables, colors, images, links, and much more.
                </p>
              </div>

              {/* Brand selection */}
              <div className="space-y-2">
                <Label htmlFor="brandId">{t("products.form.labels.brand_optional")}</Label>
                <select
                  id="brandId"
                  name="brandId"
                  value={(product as any).brandId || ""}
                  onChange={(e) =>
                    setProduct((prev) => ({ ...prev, brandId: e.target.value }))
                  }
                  className="rounded-md border bg-background px-3 py-2 text-sm w-full"
                >
                  <option value="">{t("products.form.placeholders.select_brand")}</option>
                  {brandsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Optional - associate this product with a brand
                </p>
              </div>



              {/* Product Settings */}
              <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
                <h3 className="text-lg font-semibold">{t("products.form.settings.product_settings")}</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* <div className="flex items-center gap-2">
                    <Checkbox
                      id="isSupplement"
                      name="isSupplement"
                      checked={product.isSupplement}
                      onCheckedChange={(checked) =>
                        setProduct((prev) => ({
                          ...prev,
                          isSupplement: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="isSupplement">Is Supplement</Label>
                  </div> */}

                  {/* <div className="flex items-center gap-2">
                    <Checkbox
                      id="featured"
                      name="featured"
                      checked={product.featured}
                      onCheckedChange={(checked) =>
                        setProduct((prev) => ({ ...prev, featured: !!checked }))
                      }
                    />
                    <Label htmlFor="featured">Featured Product</Label>
                  </div> */}

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isActive"
                      name="isActive"
                      checked={product.isActive}
                      onCheckedChange={(checked) =>
                        setProduct((prev) => ({ ...prev, isActive: !!checked }))
                      }
                    />
                    <Label htmlFor="isActive">{t("products.form.labels.active")}</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ourProduct"
                      name="ourProduct"
                      checked={product.ourProduct}
                      onCheckedChange={(checked) =>
                        setProduct((prev) => ({
                          ...prev,
                          ourProduct: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="ourProduct">
                      {t("products.form.labels.our_product")}
                    </Label>
                  </div>
                </div>

                {/* Product Type Selection */}
                <div className="space-y-2">
                  <Label>{t("products.form.settings.product_type")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("products.form.settings.select_type_hint")}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { key: "featured", label: t("products.form.settings.types.featured"), icon: "⭐" },
                      { key: "bestseller", label: t("products.form.settings.types.bestseller"), icon: "📈" },
                      { key: "trending", label: t("products.form.settings.types.trending"), icon: "🔥" },
                      { key: "new", label: t("products.form.settings.types.new"), icon: "🆕" },
                    ].map((type) => (
                      <div key={type.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`productType-${type.key}`}
                          checked={
                            Array.isArray(product.productType) &&
                            product.productType.includes(type.key)
                          }
                          onCheckedChange={(checked) => {
                            setProduct((prev) => ({
                              ...prev,
                              productType: checked
                                ? [...prev.productType, type.key]
                                : prev.productType.filter(
                                  (t) => t !== type.key
                                ),
                            }));
                          }}
                          className="h-6 w-6 border-gray-400 cursor-pointer"
                        />
                        <Label
                          htmlFor={`productType-${type.key}`}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <span>{type.icon}</span>
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sale Price (Actual Price) */}
              <div className="grid gap-2">
                <Label htmlFor="sellingPrice">Sale Price (Actual Price)</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="sellingPrice"
                    name="sellingPrice"
                    type="number"
                    min="0"
                    value={product.sellingPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              {/* Stock Quantity */}
              <div className="grid gap-2">
                <Label htmlFor="quantity">{t("products.form.labels.stock_quantity")} *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={product.quantity}
                  onChange={handleChange}
                  placeholder="0"
                  required
                />
              </div>

              {/* SKU Field */}
              <div className="grid gap-2">
                <Label htmlFor="sku">Product SKU (Manual)</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={product.sku}
                  onChange={handleChange}
                  placeholder="Enter SKU manually"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter SKU manually for this product
                </p>
              </div>

              {/* MRP (Original Price) */}
              <div className="grid gap-2">
                <Label htmlFor="mrp">MRP (Original Price)</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="mrp"
                    name="mrp"
                    type="number"
                    min="0"
                    value={product.mrp}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            {/* Product Images - Dropzone */}
            <div>

              <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
                <h2 className="text-xl font-semibold border-b pb-2">
                  Product Images
                </h2>
                <div className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{t("products.form.media.upload_title")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("products.form.media.drag_drop_hint")}
                    </p>
                  </div>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-md p-8 cursor-pointer transition-colors text-center bg-white ${isDragActive
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                  >
                    <input {...getInputProps()} />
                    <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    {isDragActive ? (
                      <p className="text-blue-600 font-medium">
                        {t("products.form.media.drop_here")}
                        {t("products.form.media.drop_text")}
                      </p>
                    ) : (
                      <>
                        <p className="text-muted-foreground">
                          {t("products.form.media.drop_multiple_images")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("products.form.media.upload_hint")}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Fallback file input */}
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          onDrop(files);
                          // Clear the input so the same file can be selected again
                          e.target.value = "";
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t("products.form.media.alternative_input_hint")}
                    </p>
                  </div>

                  {/* Manual File Input as Fallback */}
                </div>

                {/* Image previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label>{t("products.form.sections.product_images")}</Label>
                      <Badge variant="outline" className="text-xs">
                        {imagePreviews.length} {t("products.form.media.image")}
                        {imagePreviews.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div
                            className={`relative h-32 rounded-md overflow-hidden border-2 ${preview.isPrimary ? "border-primary" : "border-transparent"}`}
                          >
                            <img
                              src={preview.url}
                              alt={`Product preview ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                            {preview.isPrimary && (
                              <span className="absolute top-2 left-2 bg-primary text-white text-xs py-1 px-2 rounded-full">
                                {t("products.form.media.primary_image")}
                              </span>
                            )}
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                            {!preview.isPrimary && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 bg-white hover:bg-primary hover:text-white"
                                onClick={() => setPrimaryImage(index)}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-white hover:bg-destructive hover:text-white"
                              onClick={() => removeImage(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEO Section */}
            <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
              <h2 className="text-xl font-semibold border-b pb-2">
                {t("products.form.sections.seo_information")}
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">{t("products.form.seo.title_label")}</Label>
                  <Input
                    id="metaTitle"
                    name="metaTitle"
                    value={product.metaTitle}
                    onChange={handleChange}
                    placeholder={t("products.form.seo.title_placeholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("products.form.seo.title_hint")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">{t("products.form.seo.description_label")}</Label>
                  <Textarea
                    id="metaDescription"
                    name="metaDescription"
                    value={product.metaDescription}
                    onChange={handleChange}
                    placeholder={t("products.form.seo.description_placeholder")}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("products.form.seo.description_hint")}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {t("products.form.seo.current_length")}: {product.metaDescription?.length || 0} / 160
                    {t("products.form.seo.characters")}
                    {product.metaDescription &&
                      product.metaDescription.length > 160 && (
                        <span className="text-destructive ml-2">⚠️ {t("products.form.seo.too_long")}</span>
                      )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">{t("products.form.seo.keywords_label")}</Label>
                  <Input
                    id="keywords"
                    name="keywords"
                    value={product.keywords}
                    onChange={handleChange}
                    placeholder={t("products.form.seo.keywords_placeholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("products.form.seo.keywords_hint")}
                  </p>
                </div>
              </div>
            </div>



            <div className="space-y-6">
              {/* 2. Link Existing Products (New Request) */}
              {mode === "edit" && (
                <div className="space-y-4 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Link Existing Products</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowProductLinker(!showProductLinker)}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      {showProductLinker ? "Close Search" : "Search to Link Products"}
                    </Button>
                  </div>

                  {showProductLinker && (
                    <div className="space-y-3 p-4 bg-white border rounded-xl shadow-sm">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Type product name to add as variant..."
                          value={variantProductSearch}
                          onChange={(e) => setVariantProductSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {isSearchingProducts && (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}

                      {variantSearchResults.length > 0 && (
                        <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                          {variantSearchResults.map((prod) => (
                            <div
                              key={prod.id}
                              onClick={() => addProductToVariantGroup(prod)}
                              className="flex items-center justify-between p-2 border rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all animate-in fade-in slide-in-from-top-1"
                            >
                              <div className="flex items-center gap-3">
                                {prod.images?.[0] ? (
                                  <img
                                    src={prod.images[0].url}
                                    className="h-10 w-10 rounded object-cover border"
                                    alt=""
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                                    <Package className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-semibold">{prod.name}</p>
                                  <div className="flex gap-1 mt-0.5">
                                    {prod.variants?.[0]?.attributes?.map((attr: any, i: number) => (
                                      <Badge key={i} variant="outline" className="text-[8px] py-0 px-1 leading-tight">
                                        {attr.value}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-gray-400">SKU: {prod.variants?.[0]?.sku || "N/A"}</p>
                                </div>
                              </div>
                              <Plus className="h-4 w-4 text-primary" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {variantGroupProducts.length > 0 && (
                    <div className="grid gap-3">
                      <Label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Linked Products ({variantGroupProducts.length})</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {variantGroupProducts.map((vProduct, vIdx) => (
                          <div key={vProduct.id} className="relative group p-3 bg-white border rounded-xl flex items-center gap-3 shadow-sm">
                            <div className="h-12 w-12 rounded-lg bg-gray-50 flex items-center justify-center border overflow-hidden">
                              {vProduct.images?.[0] ? (
                                <img src={vProduct.images[0].url} className="h-full w-full object-cover" alt="" />
                              ) : (
                                <Package className="h-6 w-6 text-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{vProduct.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <select
                                  className="text-[10px] bg-gray-50 border-none rounded p-0.5"
                                  value={variantGroupType}
                                  onChange={(e) => setVariantGroupType(e.target.value)}
                                >
                                  <option value="Color">Color</option>
                                  <option value="Size">Size</option>
                                  <option value="Material">Material</option>
                                </select>
                                <Input
                                  className="h-5 text-[10px] p-1 w-20"
                                  placeholder="Label (e.g. Red)"
                                  value={vProduct.label || ""}
                                  onChange={(e) => {
                                    const newProds = [...variantGroupProducts];
                                    newProds[vIdx].label = e.target.value;
                                    setVariantGroupProducts(newProds);
                                  }}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeProductFromVariantGroup(vProduct.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Variant List (Combined) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Available Variations</h3>

                </div>

                {variants.length > 0 ? (
                  <div className="space-y-4">
                    {variants.map((variant, variantIndex) => (
                      <VariantCard
                        key={variant.id || `variant-${variantIndex}`}
                        variant={variant}
                        index={variantIndex}
                        onUpdate={updateVariantByIndex}
                        onRemove={removeVariantByIndex}
                        onImagesChange={handleVariantImagesChange}
                        isEditMode={mode === "edit"}
                        shiprocketEnabled={shiprocketEnabled}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 border-2 border-dashed rounded-xl bg-white/50 text-gray-400">
                    <p className="text-sm">Configured variants will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MOQ Settings Section */}
          <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
            <h2 className="text-xl font-semibold border-b pb-2">
              {t("products.form.sections.moq_settings")}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
                <div className="space-y-0.5">
                  <Label htmlFor="product-moq-enabled" className="text-base font-medium">
                    {t("products.form.moq.enable_moq_label")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("products.form.moq.enable_moq_hint")}
                  </p>
                </div>
                <Switch
                  id="product-moq-enabled"
                  checked={productMOQ.isActive}
                  onCheckedChange={(checked) =>
                    setProductMOQ({ ...productMOQ, isActive: checked })
                  }
                />
              </div>

              {productMOQ.isActive && (
                <div className="space-y-2">
                  <Label htmlFor="product-min-quantity">
                    {t("products.form.moq.minimum_quantity_label")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="product-min-quantity"
                    type="number"
                    min="1"
                    value={productMOQ.minQuantity}
                    onChange={(e) =>
                      setProductMOQ({
                        ...productMOQ,
                        minQuantity: parseInt(e.target.value) || 1,
                      })
                    }
                    placeholder={t("products.form.moq.minimum_quantity_placeholder")}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("products.form.moq.minimum_quantity_hint")}
                  </p>
                </div>
              )}

              <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    {t("products.form.moq.moq_priority_title")}
                  </p>
                  <p className="text-sm text-blue-800">
                    {t("products.form.moq.moq_priority_hint")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Dimensions Section - Only show when Shiprocket is enabled and no variants */}
          {
            shiprocketEnabled && !hasVariants && (
              <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    {t("products.form.shipping.title")}
                  </h2>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    {t("common.optional") || "Optional"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("products.form.shipping.description")}
                </p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping-length">{t("products.form.shipping.length_label")}</Label>
                    <Input
                      id="shipping-length"
                      type="number"
                      min="0"
                      step="0.1"
                      value={product.shippingLength || ""}
                      onChange={(e) => setProduct({ ...product, shippingLength: e.target.value })}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping-breadth">{t("products.form.shipping.breadth_label")}</Label>
                    <Input
                      id="shipping-breadth"
                      type="number"
                      min="0"
                      step="0.1"
                      value={product.shippingBreadth || ""}
                      onChange={(e) => setProduct({ ...product, shippingBreadth: e.target.value })}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping-height">{t("products.form.shipping.height_label")}</Label>
                    <Input
                      id="shipping-height"
                      type="number"
                      min="0"
                      step="0.1"
                      value={product.shippingHeight || ""}
                      onChange={(e) => setProduct({ ...product, shippingHeight: e.target.value })}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping-weight">{t("products.form.shipping.weight_label")}</Label>
                    <Input
                      id="shipping-weight"
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.shippingWeight || ""}
                      onChange={(e) => setProduct({ ...product, shippingWeight: e.target.value })}
                      placeholder="e.g. 0.5"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("products.form.shipping.optional_hint")}
                </p>
              </div>
            )
          }

          {/* Variant Group Section - Link products as variants */}
          {
            mode === "edit" && (
              <div className="space-y-4 rounded-lg border p-4 bg-purple-50">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-xl font-semibold">Variant Group (Link Products)</h2>
                  <Switch
                    checked={variantGroupEnabled}
                    onCheckedChange={setVariantGroupEnabled}
                  />
                </div>

                {variantGroupEnabled && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Link this product with other products as variants (e.g., different colors of the same product).
                    </p>

                    {/* Variant Type Selection */}
                    <div className="grid gap-2">
                      <Label>Variant Type</Label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={variantGroupType}
                        onChange={(e) => setVariantGroupType(e.target.value)}
                      >
                        <option value="Color">Color</option>
                        <option value="Size">Size</option>
                        <option value="Material">Material</option>
                        <option value="Style">Style</option>
                      </select>
                    </div>

                    {/* Product Search */}
                    <div className="grid gap-2">
                      <Label>Search Products to Add</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search by product name..."
                          value={variantProductSearch}
                          onChange={(e) => setVariantProductSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>

                      {/* Search Results */}
                      {isSearchingProducts && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching...
                        </div>
                      )}
                      {variantSearchResults.length > 0 && (
                        <div className="border rounded-md max-h-48 overflow-y-auto bg-white">
                          {variantSearchResults.map((prod) => (
                            <div
                              key={prod.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 border-b last:border-b-0"
                              onClick={() => addProductToVariantGroup(prod)}
                            >
                              {prod.images?.[0]?.url && (
                                <img
                                  src={prod.images[0].url.startsWith("http") ? prod.images[0].url : `https://files.dfixkart.com/${prod.images[0].url}`}
                                  alt={prod.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              )}
                              <div>
                                <p className="font-medium text-sm">{prod.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {prod.variants?.[0]?.sku || "N/A"}</p>
                              </div>
                              <Plus className="ml-auto h-4 w-4 text-green-600" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Products */}
                    {variantGroupProducts.length > 0 && (
                      <div className="space-y-2">
                        <Label>Linked Variant Products ({variantGroupProducts.length})</Label>
                        <div className="space-y-2">
                          {variantGroupProducts.map((prod, index) => (
                            <div
                              key={prod.id}
                              className="flex items-center gap-2 p-2 bg-white border rounded-md"
                            >
                              {prod.images?.[0]?.url && (
                                <img
                                  src={prod.images[0].url.startsWith("http") ? prod.images[0].url : `https://files.dfixkart.com/${prod.images[0].url}`}
                                  alt={prod.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{prod.name}</p>
                                <Input
                                  type="text"
                                  placeholder="Label (e.g., Red, Blue)"
                                  value={prod.label || ""}
                                  onChange={(e) => {
                                    setVariantGroupProducts((prev) =>
                                      prev.map((p, i) =>
                                        i === index ? { ...p, label: e.target.value } : p
                                      )
                                    );
                                  }}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProductFromVariantGroup(prod.id)}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          }

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/products")}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? t("common.creating") : t("common.updating")}
                </>
              ) : mode === "create" ? (
                t("products.form.add_product_button")
              ) : (
                t("products.form.update_product_button")
              )}
            </Button>
          </div>
        </form >
      </Card >
    </div >
  );
}

// CategorySelector component
const CategorySelector = ({
  selectedCategoryIds,
  onSelectCategory,
  primaryCategoryId,
  onSetPrimaryCategory,
  categories,
  isLoading,
}: {
  selectedCategoryIds: string[];
  onSelectCategory: (categoryId: string) => void;
  primaryCategoryId: string | null;
  onSetPrimaryCategory: (categoryId: string) => void;
  categories: any[];
  isLoading: boolean;
}) => {
  const { t } = useLanguage();
  if (isLoading) {
    return <div className="text-sm text-gray-500">{t("products.form.categories.loading")}</div>;
  }

  if (!categories || categories.length === 0) {
    return <div className="text-sm text-gray-500">{t("products.form.categories.no_categories")}</div>;
  }

  // Create a map of parent-child relationships for quick access
  const parentChildMap = new Map();
  categories.forEach((category) => {
    if (category.children && category.children.length > 0) {
      parentChildMap.set(
        category.id,
        category.children.map((child: any) => child.id)
      );
    }
  });

  // Create a map of child-parent relationships for quick access
  const childParentMap = new Map();
  categories.forEach((category) => {
    if (category.parentId) {
      childParentMap.set(category.id, category.parentId);
    }
  });

  // Ensure we have a primary category if we have selected categories
  const ensuredPrimaryId =
    primaryCategoryId ||
    (selectedCategoryIds.length > 0 ? selectedCategoryIds[0] : null);

  // Helper functions
  const isParent = (categoryId: string) => parentChildMap.has(categoryId);
  const isChild = (categoryId: string) => childParentMap.has(categoryId);
  const getParentId = (categoryId: string) => childParentMap.get(categoryId);
  const getChildrenIds = (categoryId: string) =>
    parentChildMap.get(categoryId) || [];

  // Handle selection with parent-child logic
  const handleCategorySelect = (categoryId: string) => {
    let newSelectionIds = [...selectedCategoryIds];
    const isCurrentlySelected = newSelectionIds.includes(categoryId);

    if (isCurrentlySelected) {
      // If deselecting, remove this category
      newSelectionIds = newSelectionIds.filter(
        (id: string) => id !== categoryId
      );

      // If this is a parent, also remove all its children
      if (isParent(categoryId)) {
        const childrenIds = getChildrenIds(categoryId);
        newSelectionIds = newSelectionIds.filter(
          (id: string) => !childrenIds.includes(id)
        );
      }
    } else {
      // If selecting, add this category
      newSelectionIds.push(categoryId);

      // If this is a child, also select its parent if not already selected
      if (isChild(categoryId)) {
        const parentId = getParentId(categoryId);
        if (parentId && !newSelectionIds.includes(parentId)) {
          newSelectionIds.push(parentId);
        }
      }
    }

    // Update primary category if needed
    let newPrimaryId = ensuredPrimaryId;
    if (isCurrentlySelected && categoryId === ensuredPrimaryId) {
      // If deselecting the primary category, choose a new one
      newPrimaryId = newSelectionIds.length > 0 ? newSelectionIds[0] : null;
      if (newPrimaryId) {
        onSetPrimaryCategory(newPrimaryId);
      }
    } else if (!ensuredPrimaryId && newSelectionIds.length > 0) {
      // If no primary category exists yet, set the first selected one
      newPrimaryId = newSelectionIds[0];
      onSetPrimaryCategory(newPrimaryId);
    }

    // Call parent's handler with new selection
    onSelectCategory(categoryId);
  };

  // Filter only parent categories (those without parentId)
  const parentCategories = categories.filter((category) => !category.parentId);

  // Render a category and its children recursively
  const renderCategory = (category: any) => {
    const categoryId = category._id || category.id;
    const isSelected = selectedCategoryIds.includes(categoryId);
    const isPrimary = ensuredPrimaryId === categoryId;

    // Find children of this category
    const childCategories = categories.filter((c) => c.parentId === categoryId);

    return (
      <div key={categoryId} className="category-group">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`cat-${categoryId}`}
              checked={isSelected}
              onChange={() => handleCategorySelect(categoryId)}
              className="mr-2 h-6 w-6 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label
              htmlFor={`cat-${categoryId}`}
              className="text-sm font-medium cursor-pointer"
            >
              {category.name}
            </label>
          </div>

          {isSelected && selectedCategoryIds.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onSetPrimaryCategory(categoryId);
              }}
              className={`text-xs px-2 py-1 rounded-full ${isPrimary
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {isPrimary ? t("products.form.categories.primary") : t("products.form.categories.set_as_primary")}
            </button>
          )}
        </div>

        {/* Render children with indentation */}
        {childCategories.length > 0 && (
          <div className="pl-6 border-l-2 border-gray-100 ml-1.5 mt-1">
            {childCategories.map((child) => {
              const childId = child._id || child.id;
              const isChildSelected = selectedCategoryIds.includes(childId);
              const isChildPrimary = ensuredPrimaryId === childId;

              return (
                <div
                  key={childId}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center">
                    <span className="mr-2 text-xs text-muted-foreground">
                      ↳
                    </span>
                    <input
                      type="checkbox"
                      id={`cat-${childId}`}
                      checked={isChildSelected}
                      onChange={() => handleCategorySelect(childId)}
                      className="mr-2 h-6 w-6 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label
                      htmlFor={`cat-${childId}`}
                      className="text-sm cursor-pointer"
                    >
                      {child.name}
                    </label>
                  </div>

                  {isChildSelected && selectedCategoryIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onSetPrimaryCategory(childId);
                      }}
                      className={`text-xs px-2 py-1 rounded-full ${isChildPrimary
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      {isChildPrimary ? "Primary" : "Set as Primary"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2 border rounded-md p-3 max-h-60 overflow-y-auto bg-white">
      <div className="font-medium text-sm mb-1">
        Select categories (multiple allowed):
      </div>
      <div className="space-y-2">
        {parentCategories.map((category) => renderCategory(category))}
      </div>
    </div>
  );
};

export default function ProductsPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewProduct = location.pathname.includes("/new");
  const isEditProduct = !!id;

  // Show appropriate content based on route
  if (isNewProduct) {
    return <ProductForm mode="create" />;
  }

  if (isEditProduct) {
    return <ProductForm mode="edit" productId={id} />;
  }

  return <ProductsList />;
}

// Product List Component
function ProductsList() {
  const { t } = useLanguage();
  const [productsList, setProductsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // States for delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const params = {
          page: currentPage,
          limit: 10,
          ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
          ...(selectedCategory && { category: selectedCategory }),
        };

        const response = await products.getProducts(params);

        if (response.data.success) {
          const products = response.data.data?.products || [];

          setProductsList(products);
          setTotalPages(response.data.data?.pagination?.pages || 1);
        } else {
          setError(response.data.message || "Failed to fetch products");
        }
      } catch (error: any) {
        console.error("Error fetching products:", error);
        setError("Failed to load products. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, debouncedSearchQuery, selectedCategory]);

  // Fetch categories for filter
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categories.getCategories();

        if (response.data.success) {
          setCategoriesList(response.data.data?.categories || []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Get base price and sale price for a product
  const getProductPrices = (product: any) => {
    if (!product.variants || product.variants.length === 0) {
      return { basePrice: "0", regularPrice: "0", hasSale: false };
    }

    // For products with variants, show the lowest price
    if (product.hasVariants && product.variants.length > 1) {
      // Find the lowest regular price and its corresponding sale price
      const lowestPriceVariant = product.variants.reduce(
        (lowest: any, current: any) => {
          const currentPrice = Number(current.price);
          const lowestPrice = Number(lowest.price);
          return currentPrice < lowestPrice ? current : lowest;
        },
        product.variants[0]
      );

      return {
        basePrice: lowestPriceVariant.salePrice || lowestPriceVariant.price,
        regularPrice: lowestPriceVariant.salePrice
          ? lowestPriceVariant.price
          : null,
        hasSale: !!lowestPriceVariant.salePrice,
      };
    }

    // For simple products
    const variant = product.variants[0];
    return {
      basePrice: variant.salePrice || variant.price,
      regularPrice: variant.salePrice ? variant.price : null,
      hasSale: !!variant.salePrice,
    };
  };

  // Organize categories into a hierarchical structure
  const organizeCategories = () => {
    // Create parent categories
    const parentCategories = categoriesList
      .filter((category) => !category.parentId)
      .map((parent) => ({
        ...parent,
        children: categoriesList.filter(
          (child) => child.parentId === parent.id
        ),
      }));

    return parentCategories;
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  // Handle product deletion
  const handleDeleteProduct = async (
    productId: string,
    force: boolean = false
  ) => {
    setDeletingProduct(true);

    try {
      const response = await products.deleteProduct(productId, force);

      if (response.data.success) {
        // Check if the message indicates the product has orders and cannot be deleted
        if (
          !force &&
          response.data.message?.includes("has associated orders") &&
          response.data.message?.includes("cannot be deleted")
        ) {
          // Show force delete dialog
          setProductToDelete(productId);
          setIsForceDeleteDialogOpen(true);
        }
        // If message indicates product is just marked inactive
        else if (
          response.data.message?.includes("cannot be deleted") &&
          response.data.message?.includes("marked as inactive")
        ) {
          toast.success("Product marked as inactive");

          // Update product status in the list
          setProductsList((prevProducts) =>
            prevProducts.map((product) =>
              product.id === productId
                ? { ...product, isActive: false }
                : product
            )
          );

          // Close dialogs if open
          setIsDeleteDialogOpen(false);
          setIsForceDeleteDialogOpen(false);
        } else {
          toast.success("Product deleted successfully");
          // Remove from product list
          setProductsList((prevProducts) =>
            prevProducts.filter((product) => product.id !== productId)
          );

          // Close dialogs if open
          setIsDeleteDialogOpen(false);
          setIsForceDeleteDialogOpen(false);
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
  const handleMarkAsInactive = async (productId: string) => {
    try {
      const formData = new FormData();
      formData.append("isActive", "false");

      const response = await products.updateProduct(productId, formData as any);

      if (response.data.success) {
        toast.success("Product marked as inactive successfully");

        // Update product status in the list
        setProductsList((prevProducts) =>
          prevProducts.map((product) =>
            product.id === productId ? { ...product, isActive: false } : product
          )
        );

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

  // Function to open delete dialog
  const openDeleteDialog = (productId: string) => {
    setProductToDelete(productId);
    setIsDeleteDialogOpen(true);
  };

  // Handle product status toggle (active/inactive)
  const handleToggleProductStatus = async (
    productId: string,
    currentStatus: boolean
  ) => {
    try {
      const formData = new FormData();
      formData.append("isActive", (!currentStatus).toString());

      const response = await products.updateProduct(productId, formData as any);

      if (response.data.success) {
        toast.success(
          `Product ${currentStatus ? "deactivated" : "activated"} successfully`
        );

        // Update product status in the list
        setProductsList((prevProducts) =>
          prevProducts.map((product) =>
            product.id === productId
              ? { ...product, isActive: !currentStatus }
              : product
          )
        );
      } else {
        toast.error(
          response.data.message ||
          `Failed to ${currentStatus ? "deactivate" : "activate"} product`
        );
      }
    } catch (error: any) {
      console.error(
        `Error ${currentStatus ? "deactivating" : "activating"} product:`,
        error
      );
      toast.error(
        error.message ||
        `An error occurred while ${currentStatus ? "deactivating" : "activating"} the product`
      );
    }
  };

  // Render option for a category with proper indentation
  const renderCategoryOption = (category: any, level = 0) => {
    return (
      <Fragment key={category.id}>
        <option value={category.id}>
          {level > 0 ? "↳ ".repeat(level) : ""}
          {category.name}
        </option>
        {category.children &&
          category.children.map((child: any) =>
            renderCategoryOption(child, level + 1)
          )}
      </Fragment>
    );
  };

  // Loading state
  if (isLoading && productsList.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && productsList.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FEF2F2] mb-4">
          <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
        </div>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-1.5">
          Something went wrong
        </h2>
        <p className="text-center text-[#9CA3AF] mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-[#4CAF50] text-[#2E7D32] hover:bg-[#E8F5E9]"
          onClick={() => {
            setError(null);
            setCurrentPage(1);
            setIsLoading(true);
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Organize categories hierarchically
  const hierarchicalCategories = organizeCategories();

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={isDeleteDialogOpen}
        setOpen={setIsDeleteDialogOpen}
        title={t("products.details.dialogs.delete_title")}
        description={t("products.details.dialogs.delete_desc")}
        onConfirm={() => {
          if (productToDelete) {
            handleDeleteProduct(productToDelete, false);
          }
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
          if (productToDelete) {
            handleDeleteProduct(productToDelete, true);
          }
        }}
        loading={deletingProduct}
        confirmText={t("products.details.actions.delete")}
        isDestructive={true}
        secondaryAction={{
          text: t("products.details.dialogs.mark_inactive"),
          onClick: () => {
            if (productToDelete) {
              handleMarkAsInactive(productToDelete);
            }
          },
        }}
      />

      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t("products.title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t("products.form.sections.basic_desc")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                type="search"
                placeholder={t("products.list.search_placeholder")}
                className="pl-9 rounded-full border-[#E5E7EB] bg-[#FFFFFF] focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch(e)}
              />
            </div>
            <Button
              asChild
            >
              <Link to="/products/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("products.add_new")}
              </Link>
            </Button>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Premium Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#FFFFFF] border border-[#E5E7EB] rounded-full px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <select
          className="flex-1 min-w-[150px] rounded-full border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2 text-sm text-[#4B5563] focus:outline-none focus:border-primary"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">{t("products.list.all_categories")}</option>
          {hierarchicalCategories.map((category) =>
            renderCategoryOption(category)
          )}
        </select>
        <select
          className="rounded-full border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2 text-sm text-[#4B5563] focus:outline-none focus:border-primary"
          value=""
          onChange={() => { }}
        >
          <option value="">{t("products.list.all_status")}</option>
          <option value="active">{t("products.list.status.active")}</option>
          <option value="draft">{t("products.list.status.inactive")}</option>
        </select>
        {(selectedCategory || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F3F4F6]"
            onClick={() => {
              setSelectedCategory("");
              setSearchQuery("");
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Premium Products List - Card-Table Hybrid */}
      {isLoading && productsList.length > 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F3F7F6]/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#4CAF50]" />
        </div>
      )}

      {productsList.length === 0 ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
              <Package className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
              {t("products.list.table.no_products")}
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
              {t("products.list.table.empty_desc")}
            </p>
            <Button
              asChild
            >
              <Link to="/products/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("products.add_new")}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#E5E7EB]">
            <SafeRender>
              {productsList.map((product) => {
                const { basePrice, regularPrice, hasSale } =
                  getProductPrices(product);
                // Get image with fallback logic
                let productImage = null;

                // Priority 1: Product images
                if (product.images && product.images.length > 0) {
                  productImage =
                    product.images.find((img: any) => img.isPrimary) ||
                    product.images[0];
                }
                // Priority 2: Any variant images
                else if (product.variants && product.variants.length > 0) {
                  const variantWithImages = product.variants.find(
                    (variant: any) =>
                      variant.images && variant.images.length > 0
                  );
                  if (variantWithImages) {
                    productImage =
                      variantWithImages.images.find(
                        (img: any) => img.isPrimary
                      ) || variantWithImages.images[0];
                  }
                }

                // Get stock count - check both stock and quantity fields
                const totalStock = product.variants?.reduce(
                  (sum: number, variant: any) => sum + (variant.stock || variant.quantity || 0),
                  0
                ) || 0;

                return (
                  <div
                    key={product.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-[#F3F7F6] transition-colors relative"
                  >
                    <div className="flex items-center gap-4 w-full sm:w-auto sm:flex-1 min-w-0">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {productImage ? (
                          <img
                            src={productImage.url}
                            alt={product.name}
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
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-[#1F2937] text-base truncate max-w-[200px] sm:max-w-none">
                                {product.name}
                              </h3>
                              {product.ourProduct && (
                                <Badge className="bg-[#EFF6FF] text-[#3B82F6] border-[#DBEAFE] text-xs shrink-0">
                                  {t("products.list.status.our_product")}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Category - Visible on all screens now */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {product.categories &&
                                  product.categories.length > 0 ? (
                                  product.categories
                                    .slice(0, 2)
                                    .map((category: any) => (
                                      <span
                                        key={category.id}
                                        className="text-xs text-[#9CA3AF]"
                                      >
                                        {category.name}
                                      </span>
                                    ))
                                ) : (
                                  <span className="text-xs text-[#9CA3AF]">
                                    Uncategorized
                                  </span>
                                )}
                              </div>
                              {product.hasVariants && (
                                <span className="text-xs text-[#9CA3AF]">
                                  {product.variants.length} variants
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Price - Show on right for desktop, below name for mobile if needed, or keep right */}
                          <div className="text-left sm:text-right flex-shrink-0 mt-1 sm:mt-0">
                            {hasSale ? (
                              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                                <span className="font-bold text-[#1F2937]">
                                  ₹{basePrice}
                                </span>
                                <span className="text-xs line-through text-[#9CA3AF]">
                                  ₹{regularPrice}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-[#1F2937]">
                                ₹{basePrice}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Stock - Visible on all screens, stacked on mobile */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-dashed border-gray-200">
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-left sm:text-right">
                          <Badge
                            className={
                              product.isActive
                                ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs"
                                : "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7] text-xs"
                            }
                          >
                            {product.isActive ? "Active" : "Draft"}
                          </Badge>
                          {totalStock === 0 && (
                            <Badge className="bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2] text-xs ml-2 sm:ml-0 sm:mt-1 inline-block sm:block">
                              Out of stock
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions Menu - Absolute on mobile top-right or flexed here */}
                      <div className="flex-shrink-0 sm:ml-2">

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
                              asChild
                            >
                              <Link to={`/products/${product.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[#1F2937] hover:bg-[#F3F7F6]"
                              onClick={() =>
                                handleToggleProductStatus(
                                  product.id,
                                  product.isActive
                                )
                              }
                            >
                              {product.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#E5E7EB]" />
                            <DropdownMenuItem
                              className="text-[#EF4444] hover:bg-[#FEF2F2]"
                              onClick={() => openDeleteDialog(product.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </SafeRender>
          </div>

          {/* Premium Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E5E7EB] px-6 py-4 bg-[#F3F7F6]">
              <div className="text-sm text-[#9CA3AF]">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#E5E7EB] hover:bg-[#FFFFFF]"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#E5E7EB] hover:bg-[#FFFFFF]"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </Card>

      )}
    </div>
  );
}
