import { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { categories, subCategories } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  ImageIcon,
  Tags,
  HelpCircle,
  Info,
} from "lucide-react";
import { DeleteProductDialog } from "@/components/DeleteProductDialog";
import { useLanguage } from "@/context/LanguageContext";

export default function CategoriesPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewCategory = location.pathname.includes("/new");
  const isEditCategory = !!id;

  // Show appropriate content based on route
  if (isNewCategory) {
    return <CategoryForm mode="create" />;
  }

  if (isEditCategory) {
    return <CategoryForm mode="edit" categoryId={id} />;
  }

  return <CategoriesList />;
}

// Categories List Component
function CategoriesList() {
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [subCategoriesCount, setSubCategoriesCount] = useState<
    Record<string, number>
  >({});
  const { t } = useLanguage();

  // States for delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Fetch categories and sub-categories count
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await categories.getCategories();

        if (response.data.success) {
          const categoriesData = response.data.data?.categories || [];
          setCategoriesList(categoriesData);

          // Fetch sub-categories count for each category
          const counts: Record<string, number> = {};
          await Promise.all(
            categoriesData.map(async (category: any) => {
              try {
                const subResponse =
                  await subCategories.getSubCategoriesByCategory(category.id);
                if (subResponse.data?.success) {
                  counts[category.id] =
                    subResponse.data.data?.subCategories?.length || 0;
                }
              } catch (error) {
                counts[category.id] = 0;
                console.error("Error fetching sub-categories for category:", category.id, error);
              }
            })
          );
          setSubCategoriesCount(counts);
        } else {
          setError(response.data.message || "Failed to fetch categories");
        }
      } catch (error: any) {
        console.error("Error fetching categories:", error);
        setError("Failed to load categories. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Open delete dialog
  const openDeleteDialog = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setIsDeleteDialogOpen(true);
  };

  // Handle category deletion
  const handleDeleteCategory = async (
    categoryId: string,
    force: boolean = false
  ) => {
    try {
      setDeletingCategory(true);
      const response = await categories.deleteCategory(categoryId, force);

      if (response.data.success) {
        // Category was successfully deleted
        toast.success(t("categories.messages.delete_success"));
        // Remove the category from the list
        setCategoriesList((prevCategories) =>
          prevCategories.filter((category) => category.id !== categoryId)
        );
        // Close any open dialogs
        setIsDeleteDialogOpen(false);
        setIsForceDeleteDialogOpen(false);
      } else {
        toast.error(response.data.message || t("categories.messages.delete_error"));
      }
    } catch (error: any) {
      console.error("Error deleting category:", error);
      const errorMessage =
        error.response?.data?.message ||
        "An error occurred while deleting the category";

      // If the error indicates the category is in use
      if (
        errorMessage.includes("Cannot delete category with products") ||
        errorMessage.includes("has products")
      ) {
        // Show force delete dialog
        setCategoryToDelete(categoryId);
        setIsForceDeleteDialogOpen(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setDeletingCategory(false);
    }
  };

  // Loading state
  if (isLoading && categoriesList.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">
            {t("categories.loading")}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && categoriesList.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FEF2F2] mb-4">
          <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
        </div>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-1.5">{t("categories.error.title")}</h2>
        <p className="text-center text-[#9CA3AF] mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-[#4CAF50] text-[#2E7D32] hover:bg-[#E8F5E9]"
          onClick={() => {
            setError(null);
            setIsLoading(true);
          }}
        >
          {t("categories.error.try_again")}
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
        title={t("categories.delete.title")}
        description={t("categories.delete.description")}
        onConfirm={() => {
          if (categoryToDelete) {
            handleDeleteCategory(categoryToDelete, false);
          }
        }}
        loading={deletingCategory}
        confirmText={t("categories.delete.confirm")}
      />

      {/* Force Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={isForceDeleteDialogOpen}
        setOpen={setIsForceDeleteDialogOpen}
        title={t("categories.delete.force_title")}
        description={t("categories.delete.force_description")}
        onConfirm={() => {
          if (categoryToDelete) {
            handleDeleteCategory(categoryToDelete, true);
          }
        }}
        loading={deletingCategory}
        confirmText={t("categories.delete.force_button")}
        isDestructive={true}
      />

      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t("categories.title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t("categories.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => setShowHelpDialog(true)}
              title={t("categories.help_button")}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              asChild
              className=""
            >
              <Link to="/categories/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("categories.create_button")}
              </Link>
            </Button>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Categories List */}
      {categoriesList.length === 0 ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
              <Tags className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
              {t("categories.empty.title")}
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
              {t("categories.empty.description")}
            </p>
            <Button
              asChild
              className=""
            >
              <Link to="/categories/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("categories.empty.create_first")}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoriesList.map((category) => (
            <Card
              key={category.id}
              className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="h-12 w-12 rounded-lg object-cover border border-[#E5E7EB] flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex-shrink-0">
                        <ImageIcon className="h-6 w-6 text-[#9CA3AF]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1F2937] truncate">
                        {category.name}
                      </h3>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        {t("categories.sub_categories_count").replace("{count}", String(subCategoriesCount[category.id] || 0))}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 hover:bg-[#F3F4F6]"
                    asChild
                  >
                    <Link to={`/categories/${category.id}`}>
                      <Edit className="h-4 w-4 text-[#4B5563]" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 hover:bg-[#FEF2F2]"
                    onClick={() => openDeleteDialog(category.id)}
                  >
                    <Trash2 className="h-4 w-4 text-[#EF4444]" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              How Categories & Sub-Categories Work
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4 text-left">
              <div>
                <h3 className="font-semibold mb-3 text-base">
                  {t("categories.help.what_is.title")}
                </h3>
                <p className="text-sm">
                  {t("categories.help.what_is.description")}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-base">
                  {t("categories.help.relationship.title")}
                </h3>
                <div className="bg-muted p-4 rounded-md space-y-2 text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{t("categories.help.relationship.category_label")}</div>
                    <div>Women's Clothing</div>
                  </div>
                  <div className="ml-6 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">└─</span>
                      <div>{t("categories.help.relationship.subcategory_label")} Dresses</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">└─</span>
                      <div>{t("categories.help.relationship.subcategory_label")} Tops</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">└─</span>
                      <div>{t("categories.help.relationship.subcategory_label")} Pants</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-base">
                  {t("categories.help.guide.title")}
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li>
                    <strong>{t("categories.help.guide.step1.title")}</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li>{t("categories.help.guide.step1.item1")}</li>
                      <li>{t("categories.help.guide.step1.item2")}</li>
                      <li>{t("categories.help.guide.step1.item3")}</li>
                      <li>{t("categories.help.guide.step1.item4")}</li>
                    </ul>
                  </li>
                  <li>
                    <strong>{t("categories.help.guide.step2.title")}</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li>{t("categories.help.guide.step2.item1")}</li>
                      <li>{t("categories.help.guide.step2.item2")}</li>
                      <li>{t("categories.help.guide.step2.item3")}</li>
                      <li>{t("categories.help.guide.step2.item4")}</li>
                      <li>{t("categories.help.guide.step2.item5")}</li>
                      <li>{t("categories.help.guide.step2.item6")}</li>
                      <li>{t("categories.help.guide.step2.item7")}</li>
                    </ul>
                  </li>
                  <li>
                    <strong>{t("categories.help.guide.step3.title")}</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li>{t("categories.help.guide.step3.item1")}</li>
                      <li>{t("categories.help.guide.step3.item2")}</li>
                      <li>{t("categories.help.guide.step3.item3")}</li>
                      <li>{t("categories.help.guide.step3.item4")}</li>
                      <li>{t("categories.help.guide.step3.item5")}</li>
                    </ul>
                  </li>
                  <li>
                    <strong>{t("categories.help.guide.step4.title")}</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li>{t("categories.help.guide.step4.item1")}</li>
                      <li>{t("categories.help.guide.step4.item2")}</li>
                      <li>{t("categories.help.guide.step4.item3")}</li>
                      <li>{t("categories.help.guide.step4.item4")}</li>
                    </ul>
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-base">
                  {t("categories.help.limit.title")}
                </h3>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-sm text-blue-900">
                  <p className="mb-2">
                    {t("categories.help.limit.info")}
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>{t("categories.help.limit.rec1")}</li>
                    <li>{t("categories.help.limit.rec2")}</li>
                    <li>{t("categories.help.limit.rec3")}</li>
                    <li>{t("categories.help.limit.rec4")}</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-base">
                  {t("categories.help.examples.title")}
                </h3>
                <div className="bg-muted p-4 rounded-md space-y-3 text-sm text-foreground">
                  <div>
                    <strong>{t("categories.help.examples.ex1.title")}</strong>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                      <li>{t("categories.help.examples.ex1.items")}</li>
                      <li>{t("categories.help.examples.ex1.total")}</li>
                    </ul>
                  </div>
                  <div>
                    <strong>{t("categories.help.examples.ex2.title")}</strong>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                      <li>{t("categories.help.examples.ex2.items")}</li>
                      <li>{t("categories.help.examples.ex2.total")}</li>
                    </ul>
                  </div>
                  <div>
                    <strong>{t("categories.help.examples.ex3.title")}</strong>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                      <li>{t("categories.help.examples.ex3.items")}</li>
                      <li>{t("categories.help.examples.ex3.total")}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-base">
                  {t("categories.help.visibility.title")}
                </h3>
                <div className="bg-green-50 border border-green-200 p-4 rounded-md space-y-2 text-sm text-green-900">
                  <p className="font-medium">{t("categories.help.visibility.list_title")}</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>{t("categories.help.visibility.list_item1")}</li>
                    <li>{t("categories.help.visibility.list_item2")}</li>
                  </ul>
                  <p className="font-medium mt-3">{t("categories.help.visibility.edit_title")}</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>{t("categories.help.visibility.edit_item1")}</li>
                    <li>{t("categories.help.visibility.edit_item2")}</li>
                    <li>{t("categories.help.visibility.edit_item3")}</li>
                  </ul>
                  <p className="font-medium mt-3">{t("categories.help.visibility.product_title")}</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>{t("categories.help.visibility.product_item1")}</li>
                    <li>{t("categories.help.visibility.product_item2")}</li>
                    <li>{t("categories.help.visibility.product_item3")}</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-base">
                  {t("categories.help.appear.title")}
                </h3>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-md border-2 border-dashed space-y-3 text-sm border-purple-200">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="font-semibold mb-2 text-purple-900">{t("categories.help.appear.nav")}</div>
                    <div className="ml-4 space-y-1 text-purple-800">
                      <div>📁 Women's Clothing</div>
                      <div className="ml-4 space-y-1">
                        <div>└─ Dresses</div>
                        <div>└─ Tops</div>
                        <div>└─ Pants</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="font-semibold mb-2 text-purple-900">{t("categories.help.appear.page")}</div>
                    <div className="ml-4 space-y-1 text-purple-800">
                      <div>{t("categories.help.appear.page_filters")}</div>
                      <div>{t("categories.help.appear.page_products")}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-base">
                  {t("categories.help.best_practices.title")}
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80">
                  <li>{t("categories.help.best_practices.bp1")}</li>
                  <li>{t("categories.help.best_practices.bp2")}</li>
                  <li>{t("categories.help.best_practices.bp3")}</li>
                  <li>{t("categories.help.best_practices.bp4")}</li>
                  <li>{t("categories.help.best_practices.bp5")}</li>
                  <li>{t("categories.help.best_practices.bp6")}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-base">{t("categories.help.tips.title")}</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80">
                  <li>{t("categories.help.tips.tip1")}</li>
                  <li>{t("categories.help.tips.tip2")}</li>
                  <li>{t("categories.help.tips.tip3")}</li>
                  <li>{t("categories.help.tips.tip4")}</li>
                  <li>{t("categories.help.tips.tip5")}</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Category Form Component
function CategoryForm({
  mode,
  categoryId,
}: {
  mode: "create" | "edit";
  categoryId?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(mode === "edit");

  const [category, setCategory] = useState<any>({
    name: "",
    description: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Sub-categories state
  const [subCategoriesList, setSubCategoriesList] = useState<any[]>([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [showSubCategoryDialog, setShowSubCategoryDialog] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<any | null>(
    null
  );
  const [subCategoryForm, setSubCategoryForm] = useState({
    name: "",
    description: "",
  });
  const [subCategoryImageFile, setSubCategoryImageFile] = useState<File | null>(
    null
  );
  const [subCategoryImagePreview, setSubCategoryImagePreview] = useState<
    string | null
  >(null);

  // Fetch category data if editing
  useEffect(() => {
    if (mode === "edit" && categoryId) {
      const fetchCategoryDetails = async () => {
        try {
          setFormLoading(true);
          const response = await categories.getCategoryById(categoryId);

          if (response.data.success) {
            const categoryData = response.data.data?.category || {};
            setCategory({
              name: categoryData.name || "",
              description: categoryData.description || "",
            });
            if (categoryData.image) {
              setImagePreview(categoryData.image);
            }
          } else {
            toast.error(
              response.data.message || t("categories.messages.fetch_error")
            );
          }
        } catch (error) {
          console.error("Error fetching category:", error);
          toast.error(t("categories.messages.operation_failed"));
        } finally {
          setFormLoading(false);
        }
      };

      fetchCategoryDetails();
      fetchSubCategories();
    }
  }, [mode, categoryId]);

  // Fetch sub-categories
  const fetchSubCategories = async () => {
    if (!categoryId) return;
    try {
      setLoadingSubCategories(true);
      const response =
        await subCategories.getSubCategoriesByCategory(categoryId);
      if (response.data?.success) {
        setSubCategoriesList(response.data.data?.subCategories || []);
      }
    } catch (error) {
      console.error("Error fetching sub-categories:", error);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    }
  };

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setCategory((prev: any) => ({ ...prev, [name]: value }));
  };

  // Sub-category handlers
  const openSubCategoryDialog = (subCategory?: any) => {
    if (subCategory) {
      setEditingSubCategory(subCategory);
      setSubCategoryForm({
        name: subCategory.name || "",
        description: subCategory.description || "",
      });
      setSubCategoryImagePreview(subCategory.image || null);
    } else {
      setEditingSubCategory(null);
      setSubCategoryForm({ name: "", description: "" });
      setSubCategoryImagePreview(null);
    }
    setShowSubCategoryDialog(true);
  };

  const handleSubCategoryImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubCategoryImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setSubCategoryImagePreview(imageUrl);
    }
  };

  const handleSubCategorySubmit = async () => {
    if (!subCategoryForm.name.trim()) {
      toast.error(t("categories.messages.subcategory_name_required"));
      return;
    }

    if (!categoryId) {
      toast.error(
        t("categories.messages.save_category_first")
      );
      return;
    }

    try {
      setIsLoading(true);
      if (editingSubCategory) {
        // Update sub-category
        const response = await subCategories.updateSubCategory(
          editingSubCategory.id,
          {
            name: subCategoryForm.name,
            description: subCategoryForm.description,
            image: subCategoryImageFile || undefined,
          }
        );
        if (response.data?.success) {
          toast.success(t("categories.messages.subcategory_update_success"));
          fetchSubCategories();
          setShowSubCategoryDialog(false);
          resetSubCategoryForm();
        }
      } else {
        // Create sub-category
        const response = await subCategories.createSubCategory(categoryId, {
          name: subCategoryForm.name,
          description: subCategoryForm.description,
          image: subCategoryImageFile || undefined,
        });
        if (response.data?.success) {
          toast.success(t("categories.messages.subcategory_create_success"));
          fetchSubCategories();
          setShowSubCategoryDialog(false);
          resetSubCategoryForm();
        }
      }
    } catch (error: any) {
      console.error("Error saving sub-category:", error);
      toast.error(
        error.response?.data?.message || "Failed to save sub-category"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubCategory = async (subCategoryId: string) => {
    if (!confirm(t("categories.messages.delete_subcategory_confirm"))) return;
    try {
      setIsLoading(true);
      const response = await subCategories.deleteSubCategory(subCategoryId);
      if (response.data?.success) {
        toast.success(t("categories.messages.subcategory_delete_success"));
        fetchSubCategories();
      } else {
        toast.error(response.data?.message || "Failed to delete sub-category");
      }
    } catch (error: any) {
      console.error("Error deleting sub-category:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete sub-category"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetSubCategoryForm = () => {
    setSubCategoryForm({ name: "", description: "" });
    setSubCategoryImageFile(null);
    setSubCategoryImagePreview(null);
    setEditingSubCategory(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category.name) {
      toast.error(t("categories.messages.category_name_required"));
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", category.name);

      if (category.description) {
        formData.append("description", category.description);
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      let response;

      if (mode === "create") {
        response = await categories.createCategory(formData);
      } else {
        response = await categories.updateCategory(categoryId!, formData);
      }

      if (response.data.success) {
        toast.success(
          mode === "create"
            ? "Category created successfully"
            : "Category updated successfully"
        );
        navigate("/categories");
      } else {
        toast.error(response.data.message || "Operation failed");
      }
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.response?.data?.message || t(mode === "edit" ? "categories.messages.update_error" : "categories.messages.create_error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (formLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">
            {mode === "edit" ? "Loading category..." : "Preparing form..."}
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
              <Link to="/categories">
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("categories.form.back")}
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {mode === "create" ? t("categories.form.create_title") : t("categories.form.edit_title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {mode === "create"
                ? t("categories.form.create_subtitle")
                : t("categories.form.edit_subtitle")}
            </p>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-lg font-semibold text-[#1F2937]">
            {t("categories.form.info_title")}
          </CardTitle>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {t("categories.form.info_subtitle")}
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="px-6 pb-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-[#4B5563]">
                {t("categories.form.name_label").replace(" *", "")} <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={category.name}
                onChange={handleChange}
                placeholder={t("categories.form.name_placeholder")}
                required
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("categories.form.description_label")}
              </Label>
              <Textarea
                id="description"
                name="description"
                value={category.description}
                onChange={handleChange}
                placeholder={t("categories.form.description_placeholder")}
                rows={3}
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" className="text-sm font-medium text-[#4B5563]">
                {t("categories.form.image_label")}
              </Label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer border-[#E5E7EB] focus:border-primary"
                  />
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    {t("categories.form.image_recommendation")}
                  </p>
                </div>
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] flex-shrink-0">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt={t("categories.form.preview_alt")}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-[#9CA3AF]" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex justify-end gap-3 border-t border-[#E5E7EB] pt-6">
            <Button
              type="button"
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => navigate("/categories")}
            >
              {t("categories.form.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className=""
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? t("categories.messages.creating") : t("categories.messages.updating")}
                </>
              ) : mode === "create" ? (
                t("categories.form.create_submit")
              ) : (
                t("categories.form.update_submit")
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Sub-Categories Section - Only show in edit mode */}
      {mode === "edit" && categoryId && (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-[#1F2937]">
                  {t("categories.subcategories.title")}
                </CardTitle>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  {t("categories.subcategories.subtitle")}
                </p>
              </div>
              <Button
                type="button"
                className=""
                onClick={() => openSubCategoryDialog()}
                disabled={!categoryId}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("categories.subcategories.add_button")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">

            {loadingSubCategories ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#4CAF50]" />
              </div>
            ) : subCategoriesList.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                  <Tags className="h-8 w-8 text-[#9CA3AF]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
                  {t("categories.subcategories.empty_title")}
                </h3>
                <p className="text-sm text-[#9CA3AF] mb-6">
                  {t("categories.subcategories.empty_desc")}
                </p>
                <Button
                  type="button"
                  className=""
                  onClick={() => openSubCategoryDialog()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("categories.subcategories.add_button")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subCategoriesList.map((subCategory) => (
                  <Card
                    key={subCategory.id}
                    className="bg-[#F3F7F6] border-[#E5E7EB] hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-3">
                          {subCategory.image && (
                            <img
                              src={subCategory.image}
                              alt={subCategory.name}
                              className="w-full h-32 object-cover rounded-lg border border-[#E5E7EB]"
                            />
                          )}
                          <div>
                            <h3 className="font-semibold text-[#1F2937]">
                              {subCategory.name}
                            </h3>
                            {subCategory.description && (
                              <p className="text-sm text-[#9CA3AF] line-clamp-2 mt-1">
                                {subCategory.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            className={
                              subCategory.isActive
                                ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs"
                                : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB] text-xs"
                            }
                          >
                            {subCategory.isActive ? t("categories.subcategories.active") : t("categories.subcategories.inactive")}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-[#F3F4F6]"
                            onClick={() => openSubCategoryDialog(subCategory)}
                          >
                            <Edit className="h-4 w-4 text-[#4B5563]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-[#FEF2F2]"
                            onClick={() =>
                              handleDeleteSubCategory(subCategory.id)
                            }
                          >
                            <Trash2 className="h-4 w-4 text-[#EF4444]" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sub-Category Dialog */}
      <Dialog
        open={showSubCategoryDialog}
        onOpenChange={setShowSubCategoryDialog}
      >
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {editingSubCategory ? t("categories.subcategories.dialog.edit_title") : t("categories.subcategories.dialog.add_title")}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {editingSubCategory
                ? t("categories.subcategories.dialog.edit_desc")
                : t("categories.subcategories.dialog.add_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="subCategoryName"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("categories.subcategories.dialog.name_label")} <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="subCategoryName"
                value={subCategoryForm.name}
                onChange={(e) =>
                  setSubCategoryForm({
                    ...subCategoryForm,
                    name: e.target.value,
                  })
                }
                placeholder={t("categories.subcategories.dialog.name_placeholder")}
                required
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="subCategoryDescription"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("categories.subcategories.dialog.description_label")}
              </Label>
              <Textarea
                id="subCategoryDescription"
                value={subCategoryForm.description}
                onChange={(e) =>
                  setSubCategoryForm({
                    ...subCategoryForm,
                    description: e.target.value,
                  })
                }
                placeholder={t("categories.subcategories.dialog.description_placeholder")}
                rows={3}
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="subCategoryImage"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("categories.subcategories.dialog.image_label")}
              </Label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <Input
                    id="subCategoryImage"
                    type="file"
                    accept="image/*"
                    onChange={handleSubCategoryImageChange}
                    className="cursor-pointer border-[#E5E7EB] focus:border-primary"
                  />
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    {t("categories.subcategories.dialog.image_recommendation")}
                  </p>
                </div>
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] flex-shrink-0">
                  {subCategoryImagePreview ? (
                    <img
                      src={subCategoryImagePreview}
                      alt={t("categories.subcategories.dialog.preview_alt")}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-[#9CA3AF]" />
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => {
                setShowSubCategoryDialog(false);
                resetSubCategoryForm();
              }}
            >
              {t("categories.subcategories.dialog.cancel")}
            </Button>
            <Button
              className=""
              onClick={handleSubCategorySubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingSubCategory ? t("categories.messages.updating") : t("categories.messages.creating")}
                </>
              ) : editingSubCategory ? (
                t("categories.subcategories.dialog.update_button")
              ) : (
                t("categories.subcategories.dialog.create_button")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
