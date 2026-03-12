import { useState, useEffect, FormEvent } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { attributes } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tag,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit,
  AlertTriangle,
  HelpCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { ErrorDialog } from "@/components/ErrorDialog";
import { useDebounce } from "@/utils/debounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AttributesPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewAttribute = location.pathname.includes("/new");
  const isEditAttribute = !!id;

  if (isNewAttribute) {
    return <AttributeForm mode="create" />;
  }

  if (isEditAttribute) {
    return <AttributeForm mode="edit" attributeId={id} />;
  }

  return <AttributesList />;
}

function AttributesList() {
  const { t } = useLanguage();
  const [attributesList, setAttributesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorDialogContent, setErrorDialogContent] = useState({
    title: "",
    description: "",
  });


  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        setIsLoading(true);
        const params = debouncedSearch ? { search: debouncedSearch } : {};
        const response = await attributes.getAttributes(params);

        if (response.data.success) {
          setAttributesList(response.data.data?.attributes || []);
        } else {
          setError(response.data.message || "Failed to fetch attributes");
        }
      } catch (error: any) {
        console.error("Error fetching attributes:", error);
        setError("Failed to load attributes. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttributes();
  }, [debouncedSearch]);

  const handleDeleteAttribute = async (attributeId: string) => {
    try {
      const response = await attributes.deleteAttribute(attributeId);

      if (response.data.success) {
        toast.success(t("attributes.messages.delete_success"));
        setAttributesList(attributesList.filter((attr) => attr.id !== attributeId));
        setIsErrorDialogOpen(false);
      } else {
        toast.error(response.data.message || t("attributes.messages.delete_error"));
      }
    } catch (error: any) {
      console.error("Error deleting attribute:", error);

      const errorMessage =
        error.response?.data?.message ||
        "An error occurred while deleting the attribute";

      if (error.response?.status === 400 && !error.response?.data?.canForceDelete) {
        setErrorDialogContent({
          title: "Attribute In Use",
          description: errorMessage,
        });
        setIsErrorDialogOpen(true);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const confirmDeleteAttribute = (attributeId: string) => {
    if (window.confirm(t("attributes.messages.delete_confirm"))) {
      handleDeleteAttribute(attributeId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            Loading {t("attributes.title")}...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t("attributes.title")}</h1>
        <Button asChild>
          <Link to="/attributes/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("attributes.create_button")}
          </Link>
        </Button>
      </div>

      <Card className="p-4">
        <div className="mb-4">
          <Input
            placeholder={t("attributes.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {attributesList.length === 0 ? (
          <div className="py-10 text-center">
            <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">{t("attributes.empty.title")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("attributes.empty.description")}
            </p>
            <Button asChild className="mt-4">
              <Link to="/attributes/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("attributes.create_button")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("attributes.table.name")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("attributes.table.input_type")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("attributes.table.values")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">{t("attributes.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {attributesList.map((attribute) => (
                  <tr key={attribute.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{attribute.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {attribute.inputType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t("attributes.values_count", { count: attribute.values?.length || 0 })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/attributes/${attribute.id}/values`}>
                            {t("attributes.manage_values")}
                          </Link>
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/attributes/${attribute.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDeleteAttribute(attribute.id)}
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
      </Card >
    </div >
  );
}

// Industry presets for quick attribute creation
const INDUSTRY_PRESETS = {
  clothing: {
    name: "Clothing",
    attributes: [
      { name: "Size", inputType: "select" },
      { name: "Color", inputType: "select" },
    ],
  },
  supplements: {
    name: "Supplements",
    attributes: [
      { name: "Weight", inputType: "select" },
      { name: "Flavor", inputType: "select" },
    ],
  },
  medicine: {
    name: "Medicine",
    attributes: [
      { name: "Pack Size", inputType: "select" },
      { name: "Dosage", inputType: "select" },
    ],
  },
  mobile: {
    name: "Mobile Store",
    attributes: [
      { name: "RAM", inputType: "select" },
      { name: "Storage", inputType: "select" },
      { name: "Color", inputType: "select" },
    ],
  },
  electronics: {
    name: "Electronics",
    attributes: [
      { name: "Wattage", inputType: "select" },
      { name: "Capacity", inputType: "select" },
    ],
  },
  shoes: {
    name: "Shoes",
    attributes: [{ name: "Size", inputType: "select" }],
  },
  furniture: {
    name: "Furniture",
    attributes: [{ name: "Dimensions", inputType: "select" }],
  },
  vehicles: {
    name: "Vehicles",
    attributes: [
      { name: "Model", inputType: "select" },
      { name: "Engine", inputType: "select" },
      { name: "Variant", inputType: "select" },
    ],
  },
  appliances: {
    name: "Home Appliances",
    attributes: [
      { name: "Capacity", inputType: "select" },
      { name: "Color", inputType: "select" },
    ],
  },
  accessories: {
    name: "Phone Accessories",
    attributes: [
      { name: "Compatibility", inputType: "select" },
      { name: "Color", inputType: "select" },
    ],
  },
  packingTape: {
    name: "Packing Tape / BOPP Tape",
    attributes: [
      { name: "Pack Size", inputType: "select" },
      { name: "Width", inputType: "select" },
      { name: "Length", inputType: "select" },
      { name: "Color", inputType: "select" },
      { name: "Print Type", inputType: "select" },
    ],
  },
};

function AttributeForm({
  mode,
  attributeId,
}: {
  mode: "create" | "edit";
  attributeId?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === "edit");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    inputType: "select",
  });

  useEffect(() => {
    if (mode === "edit" && attributeId) {
      const fetchAttribute = async () => {
        try {
          setIsFetching(true);
          const response = await attributes.getAttributeById(attributeId);
          if (response.data.success) {
            const attribute = response.data.data.attribute;
            setFormData({
              name: attribute.name || "",
              inputType: attribute.inputType || "select",
            });
          }
        } catch (error: any) {
          console.error("Error fetching attribute:", error);
          toast.error(t("attributes.messages.load_single_error"));
          navigate("/attributes");
        } finally {
          setIsFetching(false);
        }
      };
      fetchAttribute();
    }
  }, [mode, attributeId, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "create") {
        const response = await attributes.createAttribute(formData);
        if (response.data.success) {
          toast.success(t("attributes.messages.create_success"));
          navigate("/attributes");
        } else {
          toast.error(response.data.message || t("attributes.messages.create_error"));
        }
      } else {
        const response = await attributes.updateAttribute(attributeId!, formData);
        if (response.data.success) {
          toast.success(t("attributes.messages.update_success"));
          navigate("/attributes");
        } else {
          toast.error(response.data.message || t("attributes.messages.update_error"));
        }
      }
    } catch (error: any) {
      console.error("Error saving attribute:", error);
      toast.error(
        error.response?.data?.message ||
        `Failed to ${mode === "create" ? "create" : "update"} attribute`
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/attributes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {mode === "create" ? t("attributes.form.create_title") : t("attributes.form.edit_title")}
          </h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowHelpDialog(true)}
          title={t("attributes.help_button")}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="industry">{t("attributes.form.preset_label")}</Label>
              <Select
                value={selectedIndustry}
                onValueChange={(value) => {
                  setSelectedIndustry(value);
                  if (value && INDUSTRY_PRESETS[value as keyof typeof INDUSTRY_PRESETS]) {
                    const preset = INDUSTRY_PRESETS[value as keyof typeof INDUSTRY_PRESETS];
                    // Auto-fill first attribute from preset
                    if (preset.attributes.length > 0) {
                      const firstAttr = preset.attributes[0];
                      setFormData({
                        name: firstAttr.name,
                        inputType: firstAttr.inputType,
                      });
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("attributes.form.preset_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.name} ({preset.attributes.map((a) => a.name).join(", ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t("attributes.form.preset_desc")}
              </p>
              {selectedIndustry &&
                INDUSTRY_PRESETS[selectedIndustry as keyof typeof INDUSTRY_PRESETS] && (
                  <div className="mt-2 rounded-md bg-muted p-3">
                    <p className="text-sm font-medium mb-2">
                      Available attributes for{" "}
                      {INDUSTRY_PRESETS[selectedIndustry as keyof typeof INDUSTRY_PRESETS]
                        .name}
                      :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {INDUSTRY_PRESETS[
                        selectedIndustry as keyof typeof INDUSTRY_PRESETS
                      ].attributes.map((attr, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData({
                              name: attr.name,
                              inputType: attr.inputType,
                            });
                          }}
                        >
                          {attr.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t("attributes.form.name_label")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t("attributes.form.name_placeholder")}
              required
            />
            <p className="text-sm text-muted-foreground">
              {t("attributes.form.name_desc")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inputType">{t("attributes.form.input_type_label")}</Label>
            <Select
              value={formData.inputType}
              onValueChange={(value) =>
                setFormData({ ...formData, inputType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("attributes.form.input_type_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">{t("attributes.input_types.text")}</SelectItem>
                <SelectItem value="number">{t("attributes.input_types.number")}</SelectItem>
                <SelectItem value="select">{t("attributes.input_types.select")}</SelectItem>
                <SelectItem value="multiselect">{t("attributes.input_types.multiselect")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t("attributes.form.input_type_desc")}
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? t("attributes.form.create_submit") : t("attributes.form.update_submit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/attributes")}
            >
              {t("attributes.form.cancel")}
            </Button>
          </div>
        </form>
      </Card>

      {/* Help Dialog for Create/Edit */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {mode === "create"
                ? "How to Create an Attribute"
                : "How to Edit an Attribute"}
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4 text-left">
              <div>
                <h3 className="font-semibold mb-2 text-base">
                  Step-by-Step Guide:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    <strong>Attribute Name:</strong> Enter a clear, descriptive
                    name (e.g., "Size", "Color", "RAM", "Storage", "Material").
                    This is what customers will see when selecting product
                    variants.
                  </li>
                  <li>
                    <strong>Quick Setup (Create Only):</strong> Use the industry
                    presets dropdown to quickly set up common attributes. For
                    example:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>
                        <strong>Clothing:</strong> Select "Clothing" to get Size
                        and Color attributes
                      </li>
                      <li>
                        <strong>Mobile Store:</strong> Select "Mobile Store" to
                        get RAM, Storage, and Color attributes
                      </li>
                      <li>
                        <strong>Electronics:</strong> Select "Electronics" to
                        get Wattage and Capacity attributes
                      </li>
                    </ul>
                    After selecting an industry, click on the attribute buttons
                    to auto-fill the form.
                  </li>
                  <li>
                    <strong>Input Type:</strong> Choose how customers will
                    select this attribute:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>
                        <strong>Select (Single):</strong> Customer can choose
                        one option (e.g., Size: M, L, XL)
                      </li>
                      <li>
                        <strong>Multi-Select:</strong> Customer can choose
                        multiple options (e.g., Features: Waterproof, Wireless,
                        Bluetooth)
                      </li>
                      <li>
                        <strong>Text:</strong> Customer can enter custom text
                        (e.g., Custom Message, Engraving)
                      </li>
                      <li>
                        <strong>Number:</strong> Customer enters a number (e.g.,
                        Quantity, Custom Size in cm)
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>After Creating:</strong> Once you create the
                    attribute, you'll be redirected to add values. For example,
                    if you created "Size", you'll add values like "S", "M", "L",
                    "XL".
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-base">
                  Common Examples:
                </h3>
                <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                  <div>
                    <strong>Example 1 - Clothing Store:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Attribute: "Size" → Input Type: "Select"</li>
                      <li>Values: S, M, L, XL, XXL</li>
                      <li>Attribute: "Color" → Input Type: "Select"</li>
                      <li>Values: Red, Blue, Black (with hex codes)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Example 2 - Mobile Store:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Attribute: "RAM" → Input Type: "Select"</li>
                      <li>Values: 4GB, 8GB, 12GB, 16GB</li>
                      <li>Attribute: "Storage" → Input Type: "Select"</li>
                      <li>Values: 64GB, 128GB, 256GB, 512GB</li>
                      <li>Attribute: "Color" → Input Type: "Select"</li>
                      <li>Values: Black, White, Gold, Blue</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Example 3 - Custom Product:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Attribute: "Material" → Input Type: "Select"</li>
                      <li>Values: Cotton, Polyester, Silk, Wool</li>
                      <li>Attribute: "Custom Message" → Input Type: "Text"</li>
                      <li>Customer enters their own text</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-base">
                  Editing Attributes:
                </h3>
                <p className="text-sm">
                  When editing an attribute, you can change the name and input
                  type. However, be careful when changing the input type as it
                  may affect existing product variants. After editing, make sure
                  to review and update the attribute values if needed.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-base">Tips:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>
                    Use clear, simple names that customers will understand
                  </li>
                  <li>
                    For color attributes, you can add hex color codes when
                    creating values
                  </li>
                  <li>
                    Use "Select" for most attributes (Size, Color, RAM, etc.)
                  </li>
                  <li>
                    Use "Multi-Select" only when customers need to choose
                    multiple options
                  </li>
                  <li>
                    After creating an attribute, immediately add values so you
                    can use it in products
                  </li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

