import { useState, useEffect, FormEvent, useRef } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { attributes, attributeValues } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  List,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit,
  AlertTriangle,
  X,
  Info,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { ErrorDialog } from "@/components/ErrorDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export default function AttributeValuesPage() {
  const { attributeId, id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const actualAttributeId = attributeId || searchParams.get("attributeId");
  const isNewValue = location.pathname.includes("/values/new");
  const isEditValue = !!id;

  if (!actualAttributeId && !isNewValue && !isEditValue) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <p className="mt-4 text-lg">Attribute ID is required</p>
      </div>
    );
  }

  if (isNewValue && actualAttributeId) {
    return <AttributeValueForm mode="create" attributeId={actualAttributeId} />;
  }

  if (isEditValue && actualAttributeId) {
    return (
      <AttributeValueForm
        mode="edit"
        attributeId={actualAttributeId}
        attributeValueId={id}
      />
    );
  }

  if (actualAttributeId) {
    return <AttributeValuesList attributeId={actualAttributeId} />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center py-10">
      <AlertTriangle className="h-16 w-16 text-destructive" />
      <p className="mt-4 text-lg">Invalid route</p>
    </div>
  );
}

function AttributeValuesList({ attributeId }: { attributeId: string }) {
  const { t } = useLanguage();
  const [valuesList, setValuesList] = useState<any[]>([]);
  const [attribute, setAttribute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setValueToDelete] = useState<{
    id: string;
    value: string;
  } | null>(null);

  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorDialogContent, setErrorDialogContent] = useState({
    title: "",
    description: "",
  });
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [attributeResponse, valuesResponse] = await Promise.all([
          attributes.getAttributeById(attributeId),
          attributeValues.getAttributeValues(attributeId),
        ]);

        if (attributeResponse.data.success) {
          setAttribute(attributeResponse.data.data.attribute);
        }

        if (valuesResponse.data.success) {
          setValuesList(
            valuesResponse.data.data?.values ||
            valuesResponse.data.data?.attributeValues ||
            []
          );
        } else {
          setError(valuesResponse.data.message || "Failed to fetch values");
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError("Failed to load attribute values. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [attributeId]);

  const handleDeleteValue = async (valueId: string) => {
    try {
      const response = await attributeValues.deleteAttributeValue(valueId);

      if (response.data.success) {
        toast.success(t("attribute_values.messages.delete_success"));
        setValuesList(valuesList.filter((val) => val.id !== valueId));
        setIsErrorDialogOpen(false);
      } else {
        toast.error(response.data.message || t("attribute_values.messages.delete_error"));
      }
    } catch (error: any) {
      console.error("Error deleting value:", error);

      const errorMessage =
        error.response?.data?.message ||
        "An error occurred while deleting the value";

      if (error.response?.status === 400) {
        setErrorDialogContent({
          title: "Value In Use",
          description: errorMessage,
        });
        setIsErrorDialogOpen(true);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const confirmDeleteValue = (valueId: string) => {
    const value = valuesList.find((val) => val.id === valueId);
    setValueToDelete({ id: valueId, value: value?.value || "" });
    handleDeleteValue(valueId);
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            Loading {t("attribute_values.title")}...
          </p>
        </div>
      </div>
    );
  }

  if (error && !attribute) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-10">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Something went wrong</h2>
        <p className="text-center text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ErrorDialog
        open={isErrorDialogOpen}
        setOpen={setIsErrorDialogOpen}
        title={errorDialogContent.title}
        description={errorDialogContent.description}
      />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/attributes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {attribute?.name || "Attribute"} {t("attribute_values.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("attribute_values.subtitle", { attribute: attribute?.name || "Attribute" })}
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Input Type:{" "}
              <span className="font-medium">{attribute?.inputType}</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHelpDialog(true)}
            title="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link to={`/attributes/${attributeId}/values/new`}>
              <Plus className="mr-2 h-4 w-4" />
              {t("attribute_values.create_button")}
            </Link>
          </Button>
        </div>

        {valuesList.length === 0 ? (
          <div className="py-10 text-center">
            <List className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">{t("attribute_values.empty.title")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("attribute_values.empty.description")}
            </p>
            <Button asChild className="mt-4">
              <Link to={`/attributes/${attributeId}/values/new`}>
                <Plus className="mr-2 h-4 w-4" />
                {t("attribute_values.create_button")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    {t("attribute_values.table.value")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    {t("attribute_values.table.preview")}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">
                    {t("attribute_values.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {valuesList.map((value) => (
                  <tr key={value.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{value.value}</div>
                      {value.hexCode && (
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-4 h-4 rounded border border-gray-300"
                            style={{ backgroundColor: value.hexCode }}
                          />
                          <span className="text-xs text-muted-foreground font-mono">
                            {value.hexCode}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {value.image ? (
                        <img
                          src={value.image}
                          alt={value.value}
                          className="h-12 w-12 object-cover rounded border"
                        />
                      ) : value.hexCode ? (
                        <div
                          className="h-12 w-12 rounded border-2 border-gray-300"
                          style={{ backgroundColor: value.hexCode }}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No preview
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            to={`/attribute-values/${value.id}/edit?attributeId=${attributeId}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDeleteValue(value.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              How to Use Attribute Values
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <div>
                <h3 className="font-semibold mb-2">
                  What are Attribute Values?
                </h3>
                <p className="text-sm">
                  Attribute values are the specific options customers can choose
                  when selecting product variants. For example, if you have a
                  "Size" attribute, the values might be "S", "M", "L", "XL".
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">
                  Examples by Attribute Type:
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    <strong>Size:</strong> S, M, L, XL, XXL, or numeric sizes
                    like 4, 6, 8, 10
                  </li>
                  <li>
                    <strong>Color:</strong> Red, Blue, Black, White, etc. You
                    can also add a hex color code (#FF0000) for visual
                    representation
                  </li>
                  <li>
                    <strong>RAM:</strong> 4GB, 8GB, 16GB, 32GB (for mobile
                    devices)
                  </li>
                  <li>
                    <strong>Storage:</strong> 64GB, 128GB, 256GB, 512GB (for
                    mobile devices)
                  </li>
                  <li>
                    <strong>Custom:</strong> Any value you need for your
                    products
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Color Attributes:</h3>
                <p className="text-sm mb-2">For color attributes, you can:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Enter the color name (e.g., "Red", "Navy Blue")</li>
                  <li>
                    Select or enter a hex color code (e.g., #FF0000 for red)
                  </li>
                  <li>Upload an image showing the color swatch (optional)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Quick Add Feature:</h3>
                <p className="text-sm">
                  Use the "Quick Add" dropdown to quickly add common values for
                  Size, Color, RAM, and Storage attributes. This saves time when
                  creating multiple values.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Image Upload:</h3>
                <p className="text-sm">
                  You can optionally upload an image for any attribute value.
                  This is useful for color swatches, size charts, or visual
                  representations of the value.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttributeValueForm({
  mode,
  attributeId,
  attributeValueId,
}: {
  mode: "create" | "edit";
  attributeId: string;
  attributeValueId?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === "edit");
  const [attribute, setAttribute] = useState<any>(null);
  const [formData, setFormData] = useState({
    value: "",
    hexCode: "",
    image: null as File | null,
  });
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const isColorAttribute = attribute?.name?.toLowerCase() === "color";
  const isSizeAttribute = attribute?.name?.toLowerCase() === "size";

  // Preset values for common attributes
  const PRESET_VALUES: Record<
    string,
    Array<{ value: string; hexCode?: string }>
  > = {
    size: [
      { value: "XS" },
      { value: "S" },
      { value: "M" },
      { value: "L" },
      { value: "XL" },
      { value: "XXL" },
      { value: "XXXL" },
      { value: "4" },
      { value: "6" },
      { value: "8" },
      { value: "10" },
      { value: "12" },
      { value: "14" },
      { value: "16" },
      { value: "18" },
    ],
    color: [
      { value: "Red", hexCode: "#FF0000" },
      { value: "Blue", hexCode: "#0000FF" },
      { value: "Green", hexCode: "#008000" },
      { value: "Black", hexCode: "#000000" },
      { value: "White", hexCode: "#FFFFFF" },
      { value: "Yellow", hexCode: "#FFFF00" },
      { value: "Orange", hexCode: "#FFA500" },
      { value: "Pink", hexCode: "#FFC0CB" },
      { value: "Purple", hexCode: "#800080" },
      { value: "Brown", hexCode: "#A52A2A" },
      { value: "Gray", hexCode: "#808080" },
      { value: "Navy", hexCode: "#000080" },
      { value: "Maroon", hexCode: "#800000" },
      { value: "Beige", hexCode: "#F5F5DC" },
      { value: "Cream", hexCode: "#FFFDD0" },
    ],
    ram: [
      { value: "2GB" },
      { value: "4GB" },
      { value: "6GB" },
      { value: "8GB" },
      { value: "12GB" },
      { value: "16GB" },
      { value: "32GB" },
    ],
    storage: [
      { value: "32GB" },
      { value: "64GB" },
      { value: "128GB" },
      { value: "256GB" },
      { value: "512GB" },
      { value: "1TB" },
    ],
  };

  const getPresetValues = () => {
    if (!attribute?.name) return [];
    const attrName = attribute.name.toLowerCase();
    return PRESET_VALUES[attrName] || [];
  };

  useEffect(() => {
    const fetchAttribute = async () => {
      try {
        const response = await attributes.getAttributeById(attributeId);
        if (response.data.success) {
          setAttribute(response.data.data.attribute);
        }
      } catch (error: any) {
        console.error("Error fetching attribute:", error);
        toast.error(t("attribute_values.messages.load_details_error"));
        navigate(`/attributes/${attributeId}/values`);
      }
    };

    fetchAttribute();

    if (mode === "edit" && attributeValueId) {
      const fetchValue = async () => {
        try {
          setIsFetching(true);
          const response =
            await attributeValues.getAttributeValueById(attributeValueId);
          if (response.data.success) {
            const value = response.data.data.value;
            setFormData({
              value: value.value || "",
              hexCode: value.hexCode || "",
              image: null,
            });
            if (value.image) {
              setExistingImage(value.image);
            }
          }
        } catch (error: any) {
          console.error("Error fetching value:", error);
          toast.error(t("attribute_values.messages.load_error"));
          navigate(`/attributes/${attributeId}/values`);
        } finally {
          setIsFetching(false);
        }
      };
      fetchValue();
    }
  }, [mode, attributeId, attributeValueId, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
    setExistingImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData: any = {
        value: formData.value,
      };

      // Add hexCode if it's a color attribute (always send, even if empty)
      if (isColorAttribute) {
        submitData.hexCode = formData.hexCode || "";
      }

      // Add image if provided
      if (formData.image) {
        submitData.image = formData.image;
      }

      if (mode === "create") {
        const response = await attributeValues.createAttributeValue(
          attributeId,
          submitData
        );
        if (response.data.success) {
          toast.success(t("attribute_values.messages.create_success"));
          navigate(`/attributes/${attributeId}/values`);
        } else {
          toast.error(response.data.message || t("attribute_values.messages.create_error"));
        }
      } else {
        const response = await attributeValues.updateAttributeValue(
          attributeValueId!,
          submitData
        );
        if (response.data.success) {
          toast.success(t("attribute_values.messages.update_success"));
          navigate(`/attributes/${attributeId}/values`);
        } else {
          toast.error(response.data.message || t("attribute_values.messages.update_error"));
        }
      }
    } catch (error: any) {
      console.error("Error saving value:", error);
      toast.error(
        error.response?.data?.message ||
        `Failed to ${mode === "create" ? "create" : "update"} value`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/attributes/${attributeId}/values`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {mode === "create" ? t("attribute_values.form.create_title") : t("attribute_values.form.edit_title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {attribute?.name || "Attribute"} - {attribute?.inputType || ""}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="value">{t("attribute_values.form.value_label")}</Label>
              {getPresetValues().length > 0 && (
                <Select
                  onValueChange={(selectedValue) => {
                    const preset = getPresetValues().find(
                      (p) => p.value === selectedValue
                    );
                    if (preset) {
                      setFormData({
                        ...formData,
                        value: preset.value,
                        hexCode: preset.hexCode || formData.hexCode,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Quick Add" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPresetValues().map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.value}
                        {preset.hexCode && (
                          <span
                            className="ml-2 inline-block h-4 w-4 rounded border"
                            style={{ backgroundColor: preset.hexCode }}
                          />
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              placeholder={
                attribute?.inputType === "number"
                  ? "e.g., 128, 256, 512"
                  : isColorAttribute
                    ? "e.g., Red, Blue, Black"
                    : isSizeAttribute
                      ? "e.g., S, M, L, XL"
                      : "e.g., Small, Medium, Large"
              }
              required
            />
            <p className="text-sm text-muted-foreground">
              {t("attribute_values.form.value_desc")}
            </p>
          </div>

          {/* Color Picker for Color Attributes */}
          {isColorAttribute && (
            <div className="space-y-2">
              <Label htmlFor="hexCode">{t("attribute_values.form.color_label")}</Label>
              <div className="flex gap-2">
                <Input
                  id="hexCode"
                  type="color"
                  value={formData.hexCode || "#000000"}
                  onChange={(e) =>
                    setFormData({ ...formData, hexCode: e.target.value })
                  }
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.hexCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                      setFormData({ ...formData, hexCode: value });
                    }
                  }}
                  placeholder="#FF0000"
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("attribute_values.form.color_desc")}
              </p>
              {formData.hexCode && (
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-12 h-12 rounded border-2 border-gray-300"
                    style={{ backgroundColor: formData.hexCode }}
                  />
                  <span className="text-sm font-mono">{formData.hexCode}</span>
                </div>
              )}
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="image">{t("attribute_values.form.image_label")}</Label>
            <div className="space-y-4">
              {(imagePreview || existingImage) && (
                <div className="relative inline-block">
                  <img
                    src={imagePreview || existingImage || ""}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded-md border-2 border-gray-300"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div>
                <Input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Upload an image for this attribute value (e.g., color swatch,
                  size chart)
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? t("attribute_values.form.create_submit") : t("attribute_values.form.update_submit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/attributes/${attributeId}/values`)}
            >
              {t("attribute_values.form.cancel")}
            </Button>
          </div>
        </form>
      </Card>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              How to Use Attribute Values
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <div>
                <h3 className="font-semibold mb-2">
                  What are Attribute Values?
                </h3>
                <p className="text-sm">
                  Attribute values are the specific options customers can choose
                  when selecting product variants. For example, if you have a
                  "Size" attribute, the values might be "S", "M", "L", "XL".
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">
                  Examples by Attribute Type:
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    <strong>Size:</strong> S, M, L, XL, XXL, or numeric sizes
                    like 4, 6, 8, 10
                  </li>
                  <li>
                    <strong>Color:</strong> Red, Blue, Black, White, etc. You
                    can also add a hex color code (#FF0000) for visual
                    representation
                  </li>
                  <li>
                    <strong>RAM:</strong> 4GB, 8GB, 16GB, 32GB (for mobile
                    devices)
                  </li>
                  <li>
                    <strong>Storage:</strong> 64GB, 128GB, 256GB, 512GB (for
                    mobile devices)
                  </li>
                  <li>
                    <strong>Custom:</strong> Any value you need for your
                    products
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Color Attributes:</h3>
                <p className="text-sm mb-2">For color attributes, you can:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Enter the color name (e.g., "Red", "Navy Blue")</li>
                  <li>
                    Select or enter a hex color code (e.g., #FF0000 for red)
                  </li>
                  <li>Upload an image showing the color swatch (optional)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Quick Add Feature:</h3>
                <p className="text-sm">
                  Use the "Quick Add" dropdown to quickly add common values for
                  Size, Color, RAM, and Storage attributes. This saves time when
                  creating multiple values.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Image Upload:</h3>
                <p className="text-sm">
                  You can optionally upload an image for any attribute value.
                  This is useful for color swatches, size charts, or visual
                  representations of the value.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
