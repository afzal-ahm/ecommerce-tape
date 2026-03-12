import { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { banners } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Image as ImageIcon,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Monitor,
  Smartphone,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
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

// Banner Form Component
function BannerForm({
  mode,
  bannerId,
}: {
  mode: "create" | "edit";
  bannerId?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(mode === "edit");
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    link: "/products",
    position: 0,
    isPublished: true,
    isActive: true,
  });
  const [desktopImage, setDesktopImage] = useState<File | null>(null);
  const [mobileImage, setMobileImage] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [nextPosition, setNextPosition] = useState<number | null>(null);

  // Fetch next available position for create mode
  useEffect(() => {
    if (mode === "create") {
      const fetchNextPosition = async () => {
        try {
          const response = await banners.getBanners({
            limit: 1,
            sort: "position",
            order: "desc",
          });
          if (response.data.success) {
            const bannersList = response.data.data?.banners || [];
            const maxPosition =
              bannersList.length > 0
                ? Math.max(...bannersList.map((b: any) => b.position || 0))
                : -1;
            const nextPos = maxPosition + 1;
            setNextPosition(nextPos);
            setFormData((prev) => ({ ...prev, position: nextPos }));
          }
        } catch (error) {
          console.error("Error fetching next position:", error);
          setNextPosition(0);
        }
      };
      fetchNextPosition();
    }
  }, [mode]);

  // Load banner data for edit mode
  useEffect(() => {
    if (mode === "edit" && bannerId) {
      const fetchBanner = async () => {
        try {
          setFormLoading(true);
          const response = await banners.getBannerById(bannerId);
          if (response.data.success) {
            const banner = response.data.data.banner;
            setFormData({
              title: banner.title || "",
              subtitle: banner.subtitle || "",
              link: banner.link || "/products",
              position: banner.position || 0,
              isPublished: banner.isPublished !== false,
              isActive: banner.isActive !== false,
            });
            setDesktopPreview(banner.desktopImage);
            setMobilePreview(banner.mobileImage);
          }
        } catch (error: any) {
          toast.error(t("banners.messages.load_error"));
          console.error(error);
        } finally {
          setFormLoading(false);
        }
      };
      fetchBanner();
    }
  }, [mode, bannerId]);

  // Desktop image dropzone
  const {
    getRootProps: getDesktopRootProps,
    getInputProps: getDesktopInputProps,
    isDragActive: isDesktopDragActive,
  } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) {
        setDesktopImage(acceptedFiles[0]);
        setDesktopPreview(URL.createObjectURL(acceptedFiles[0]));
      }
    },
  });

  // Mobile image dropzone
  const {
    getRootProps: getMobileRootProps,
    getInputProps: getMobileInputProps,
    isDragActive: isMobileDragActive,
  } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) {
        setMobileImage(acceptedFiles[0]);
        setMobilePreview(URL.createObjectURL(acceptedFiles[0]));
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create" && (!desktopImage || !mobileImage)) {
      toast.error(t("banners.messages.images_required"));
      return;
    }

    if (mode === "edit" && !bannerId) {
      toast.error(t("banners.messages.id_missing"));
      return;
    }

    setIsLoading(true);

    try {
      const submitData: any = {
        title: formData.title || undefined,
        subtitle: formData.subtitle || undefined,
        link: formData.link || "/products",
        position: parseInt(formData.position.toString()) || 0,
        isPublished: formData.isPublished,
        isActive: formData.isActive,
      };

      if (mode === "create") {
        submitData.desktopImage = desktopImage!;
        submitData.mobileImage = mobileImage!;
        const response = await banners.createBanner(submitData);
        if (response.data.success) {
          toast.success(t("banners.messages.create_success"));
          navigate("/banners");
        }
      } else {
        if (desktopImage) submitData.desktopImage = desktopImage;
        if (mobileImage) submitData.mobileImage = mobileImage;
        const response = await banners.updateBanner(bannerId!, submitData);
        if (response.data.success) {
          toast.success(t("banners.messages.update_success"));
          navigate("/banners");
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("banners.messages.save_error"));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!bannerId) return;
    if (!confirm(t("banners.messages.delete_confirm"))) return;

    try {
      const response = await banners.deleteBanner(bannerId);
      if (response.data.success) {
        toast.success(t("banners.messages.delete_success"));
        navigate("/banners");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("banners.messages.delete_error"));
    }
  };

  if (formLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">{t("banners.loading_banner")}</p>
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
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {mode === "create" ? t("banners.create_title") : t("banners.edit_title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {mode === "create"
                ? t("banners.create_description")
                : t("banners.edit_description")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => navigate("/banners")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("banners.back")}
            </Button>
            {mode === "edit" && (
              <Button
                variant="outline"
                className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2]"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("banners.delete")}
              </Button>
            )}
            <Button
              type="submit"
              form="banner-form"
              disabled={isLoading}
              className=""
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("banners.saving")}
                </>
              ) : (
                <>{mode === "create" ? t("banners.create_banner") : t("banners.save_changes")}</>
              )}
            </Button>
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      <form id="banner-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1F2937]">
              {t("banners.basic_info.title")}
            </CardTitle>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {t("banners.basic_info.description")}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-[#4B5563]">
                {t("banners.form.title_label")} <span className="text-[#9CA3AF] font-normal">{t("banners.form.title_optional")}</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={t("banners.form.title_placeholder")}
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="subtitle"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("banners.form.subtitle_label")} <span className="text-[#9CA3AF] font-normal">{t("banners.form.subtitle_optional")}</span>
              </Label>
              <Textarea
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) =>
                  setFormData({ ...formData, subtitle: e.target.value })
                }
                placeholder={t("banners.form.subtitle_placeholder")}
                rows={3}
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link" className="text-sm font-medium text-[#4B5563]">
                {t("banners.form.link_label")} <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) =>
                  setFormData({ ...formData, link: e.target.value })
                }
                placeholder={t("banners.form.link_placeholder")}
                required
                className="border-[#E5E7EB] focus:border-primary"
              />
              <p className="text-xs text-[#9CA3AF]">
                {t("banners.form.link_hint")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1F2937]">
              {t("banners.settings.title")}
            </CardTitle>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {t("banners.settings.description")}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="position"
                className="text-sm font-medium text-[#4B5563]"
              >
                {t("banners.settings.position_label")}
                {mode === "create" && nextPosition !== null && (
                  <span className="ml-2 text-xs text-[#9CA3AF] font-normal">
                    {t("banners.settings.position_suggested").replace("{position}", String(nextPosition))}
                  </span>
                )}
              </Label>
              <Input
                id="position"
                type="number"
                min="0"
                value={formData.position}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    position: parseInt(e.target.value) || 0,
                  })
                }
                placeholder={
                  mode === "create" ? nextPosition?.toString() || "0" : "0"
                }
                className="border-[#E5E7EB] focus:border-primary"
              />
              <p className="text-xs text-[#9CA3AF]">
                {mode === "create"
                  ? t("banners.settings.position_hint_create")
                  : t("banners.settings.position_hint_edit")}
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label
                  htmlFor="isPublished"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("banners.settings.published_label")}
                </Label>
                <p className="text-xs text-[#9CA3AF]">
                  {t("banners.settings.published_hint")}
                </p>
              </div>
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPublished: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label
                  htmlFor="isActive"
                  className="text-sm font-medium text-[#4B5563]"
                >
                  {t("banners.settings.active_label")}
                </Label>
                <p className="text-xs text-[#9CA3AF]">
                  {t("banners.settings.active_hint")}
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Desktop Image Card */}
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-[#4CAF50]" />
              <CardTitle className="text-lg font-semibold text-[#1F2937]">
                {t("banners.desktop_image.title")}
              </CardTitle>
            </div>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {t("banners.desktop_image.description")}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div
              {...getDesktopRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                isDesktopDragActive
                  ? "border-[#4CAF50] bg-[#E8F5E9]/30"
                  : "border-[#E5E7EB] hover:border-[#4CAF50] hover:bg-[#F3F7F6]"
              )}
            >
              <input {...getDesktopInputProps()} />
              {desktopPreview ? (
                <div className="space-y-4">
                  <img
                    src={desktopPreview}
                    alt={t("banners.desktop_image.preview_alt")}
                    className="max-h-80 mx-auto rounded-lg border border-[#E5E7EB] shadow-sm"
                  />
                  <p className="text-sm text-[#9CA3AF]">
                    {t("banners.desktop_image.replace_hint")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6]">
                    <ImageIcon className="h-8 w-8 text-[#9CA3AF]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1F2937]">
                      {t("banners.desktop_image.upload_title")}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-2">
                      {t("banners.desktop_image.upload_hint")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Image Card */}
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[#4CAF50]" />
              <CardTitle className="text-lg font-semibold text-[#1F2937]">
                {t("banners.mobile_image.title")}
              </CardTitle>
            </div>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {t("banners.mobile_image.description")}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div
              {...getMobileRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                isMobileDragActive
                  ? "border-[#4CAF50] bg-[#E8F5E9]/30"
                  : "border-[#E5E7EB] hover:border-[#4CAF50] hover:bg-[#F3F7F6]"
              )}
            >
              <input {...getMobileInputProps()} />
              {mobilePreview ? (
                <div className="space-y-4">
                  <img
                    src={mobilePreview}
                    alt={t("banners.mobile_image.preview_alt")}
                    className="max-h-80 mx-auto rounded-lg border border-[#E5E7EB] shadow-sm"
                  />
                  <p className="text-sm text-[#9CA3AF]">
                    {t("banners.mobile_image.replace_hint")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6]">
                    <ImageIcon className="h-8 w-8 text-[#9CA3AF]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1F2937]">
                      {t("banners.mobile_image.upload_title")}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-2">
                      {t("banners.mobile_image.upload_hint")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone for Edit Mode */}
        {mode === "edit" && (
          <Card className="bg-[#FFFFFF] border-2 border-[#EF4444]/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-[#EF4444]">
                {t("banners.danger_zone.title")}
              </CardTitle>
              <p className="text-sm text-[#9CA3AF] mt-1">
                {t("banners.danger_zone.description")}
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <Button
                type="button"
                variant="outline"
                className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2]"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("banners.danger_zone.delete_button")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 bg-[#FFFFFF] border-t border-[#E5E7EB] py-4 px-6 -mx-6 -mb-8 flex items-center justify-between gap-4 shadow-lg">
          <Button
            type="button"
            variant="outline"
            className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
            onClick={() => navigate("/banners")}
          >
            {t("banners.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className=""
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("banners.saving")}
              </>
            ) : (
              <>{mode === "create" ? t("banners.create_banner") : t("banners.save_changes")}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Banners List Component
function BannersList() {
  const { t } = useLanguage();
  const [bannersList, setBannersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPublishedFilter, setIsPublishedFilter] = useState<string>("");

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setIsLoading(true);
        const params: any = {
          page: 1,
          limit: 100,
          ...(searchQuery && { search: searchQuery }),
          ...(isPublishedFilter && { isPublished: isPublishedFilter }),
        };

        const response = await banners.getBanners(params);

        if (response.data.success) {
          setBannersList(response.data.data?.banners || []);
        } else {
          setError(response.data.message || t("banners.messages.fetch_error"));
        }
      } catch (error: any) {
        console.error("Error fetching banners:", error);
        setError(t("banners.messages.fetch_error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, [searchQuery, isPublishedFilter]);

  const handleDelete = async (bannerId: string) => {
    if (!confirm(t("banners.messages.delete_confirm_short"))) return;

    try {
      const response = await banners.deleteBanner(bannerId);
      if (response.data.success) {
        toast.success(t("banners.messages.delete_success"));
        const refreshResponse = await banners.getBanners({
          page: 1,
          limit: 100,
          ...(searchQuery && { search: searchQuery }),
          ...(isPublishedFilter && { isPublished: isPublishedFilter }),
        });
        if (refreshResponse.data.success) {
          setBannersList(refreshResponse.data.data?.banners || []);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("banners.messages.delete_error"));
    }
  };

  const handleTogglePublish = async (bannerId: string) => {
    try {
      const response = await banners.togglePublishBanner(bannerId);
      if (response.data.success) {
        const newStatus = response.data.data.banner.isPublished;
        toast.success(
          newStatus ? t("banners.messages.toggle_success_published") : t("banners.messages.toggle_success_unpublished")
        );
        setBannersList((prev) =>
          prev.map((b) =>
            b.id === bannerId ? { ...b, isPublished: newStatus } : b
          )
        );
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("banners.messages.toggle_error"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
          <p className="mt-4 text-base text-[#9CA3AF]">{t("banners.loading")}</p>
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
            <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
              {t("banners.title")}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1.5">
              {t("banners.subtitle")}
            </p>
          </div>
          <Button
            asChild
            className=""
          >
            <Link to="/banners/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("banners.create_button")}
            </Link>
          </Button>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Filters Bar */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                placeholder={t("banners.list.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <select
              value={isPublishedFilter}
              onChange={(e) => setIsPublishedFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-[#F3F7F6] text-sm text-[#4B5563] focus:border-primary focus:outline-none"
            >
              <option value="">{t("banners.list.filter_all")}</option>
              <option value="true">{t("banners.list.filter_published")}</option>
              <option value="false">{t("banners.list.filter_unpublished")}</option>
            </select>
            {(searchQuery || isPublishedFilter) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setIsPublishedFilter("");
                }}
                className="text-[#4B5563] hover:text-[#1F2937]"
              >
                {t("banners.list.clear_filters")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#DC2626] px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Banners List */}
      {bannersList.length === 0 ? (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
              <ImageIcon className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
              {t("banners.list.no_banners")}
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
              {t("banners.list.no_banners_desc")}
            </p>
            <Button
              asChild
              className=""
            >
              <Link to="/banners/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("banners.list.create_first")}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {bannersList.map((banner) => (
            <Card
              key={banner.id}
              className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Images */}
                  <div className="flex gap-3 flex-shrink-0">
                    <div className="relative group">
                      <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        {t("banners.list.desktop")}
                      </div>
                      <img
                        src={banner.desktopImage}
                        alt={banner.title || "Desktop"}
                        className="h-24 w-40 object-cover rounded-lg border border-[#E5E7EB]"
                      />
                    </div>
                    <div className="relative group">
                      <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        {t("banners.list.mobile")}
                      </div>
                      <img
                        src={banner.mobileImage}
                        alt={banner.title || "Mobile"}
                        className="h-24 w-16 object-cover rounded-lg border border-[#E5E7EB]"
                      />
                    </div>
                  </div>

                  {/* Banner Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-[#1F2937] mb-1">
                          {banner.title || t("banners.list.untitled")}
                        </h3>
                        {banner.subtitle && (
                          <p className="text-sm text-[#9CA3AF] line-clamp-2">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          className={cn(
                            "text-xs",
                            banner.isPublished
                              ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5]"
                              : "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]"
                          )}
                        >
                          {banner.isPublished ? t("banners.list.published") : t("banners.list.unpublished")}
                        </Badge>
                        <Badge
                          className={cn(
                            "text-xs",
                            banner.isActive
                              ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5]"
                              : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]"
                          )}
                        >
                          {banner.isActive ? t("banners.list.active") : t("banners.list.inactive")}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#9CA3AF]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[#4B5563]">{t("banners.list.link")}</span>
                        <code className="text-xs bg-[#F3F4F6] px-2 py-1 rounded border border-[#E5E7EB]">
                          {banner.link}
                        </code>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[#4B5563]">{t("banners.list.position")}</span>
                        <span>{banner.position}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-[#F3F4F6]"
                      onClick={() => handleTogglePublish(banner.id)}
                      title={banner.isPublished ? t("banners.list.unpublish") : t("banners.list.publish")}
                    >
                      {banner.isPublished ? (
                        <EyeOff className="h-4 w-4 text-[#4B5563]" />
                      ) : (
                        <Eye className="h-4 w-4 text-[#4B5563]" />
                      )}
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-[#F3F4F6]"
                    >
                      <Link to={`/banners/${banner.id}`}>
                        <Edit className="h-4 w-4 text-[#4B5563]" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-[#F3F4F6]"
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
                          onClick={() => handleTogglePublish(banner.id)}
                        >
                          {banner.isPublished ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              {t("banners.list.unpublish")}
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              {t("banners.list.publish")}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[#E5E7EB]" />
                        <DropdownMenuItem
                          className="text-[#EF4444] hover:bg-[#FEF2F2]"
                          onClick={() => handleDelete(banner.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("banners.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Component
export default function BannersPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewBanner = location.pathname.includes("/new");
  const isEditBanner = !!id;

  if (isNewBanner) {
    return <BannerForm mode="create" />;
  }

  if (isEditBanner) {
    return <BannerForm mode="edit" bannerId={id} />;
  }

  return <BannersList />;
}
