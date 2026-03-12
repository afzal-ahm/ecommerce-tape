import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";
import { adminAuth } from "@/api/adminService";

export default function ChangePasswordPage() {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.currentPassword) {
            newErrors.currentPassword = t("profile.current_password_required");
        }

        if (!formData.newPassword) {
            newErrors.newPassword = t("profile.new_password_required");
        } else if (formData.newPassword.length < 8) {
            newErrors.newPassword = t("profile.password_min_length");
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = t("profile.confirm_password_required");
        } else if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = t("profile.password_mismatch");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            await adminAuth.changePassword({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });

            toast.success(t("profile.password_changed"));

            // Clear form
            setFormData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setErrors({});
        } catch (error: any) {
            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                t("profile.password_change_error");
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
        setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
                            {t("profile.change_password_title")}
                        </h1>
                        <p className="text-[#9CA3AF] text-sm mt-1.5">
                            {t("profile.change_password_desc")}
                        </p>
                    </div>
                </div>
                <div className="h-px bg-[#E5E7EB]" />
            </div>

            {/* Password Change Form */}
            <Card className="bg-[#F9FAFB] border-[#E5E7EB] max-w-2xl">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                        <Lock className="h-5 w-5 text-[#4CAF50]" />
                        {t("profile.change_password_title")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Current Password */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="currentPassword"
                                className="text-sm font-medium text-[#374151]"
                            >
                                {t("profile.current_password")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showPasswords.current ? "text" : "password"}
                                    value={formData.currentPassword}
                                    onChange={(e) =>
                                        handleChange("currentPassword", e.target.value)
                                    }
                                    className={`pr-10 ${errors.currentPassword
                                            ? "border-red-500 focus:ring-red-500"
                                            : ""
                                        }`}
                                    placeholder={t("profile.enter_current_password")}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility("current")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                                    tabIndex={-1}
                                >
                                    {showPasswords.current ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {errors.currentPassword && (
                                <p className="text-sm text-red-600">{errors.currentPassword}</p>
                            )}
                        </div>

                        {/* New Password */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="newPassword"
                                className="text-sm font-medium text-[#374151]"
                            >
                                {t("profile.new_password")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPasswords.new ? "text" : "password"}
                                    value={formData.newPassword}
                                    onChange={(e) => handleChange("newPassword", e.target.value)}
                                    className={`pr-10 ${errors.newPassword ? "border-red-500 focus:ring-red-500" : ""
                                        }`}
                                    placeholder={t("profile.enter_new_password")}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility("new")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                                    tabIndex={-1}
                                >
                                    {showPasswords.new ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {errors.newPassword && (
                                <p className="text-sm text-red-600">{errors.newPassword}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="confirmPassword"
                                className="text-sm font-medium text-[#374151]"
                            >
                                {t("profile.confirm_password")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPasswords.confirm ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) =>
                                        handleChange("confirmPassword", e.target.value)
                                    }
                                    className={`pr-10 ${errors.confirmPassword
                                            ? "border-red-500 focus:ring-red-500"
                                            : ""
                                        }`}
                                    placeholder={t("profile.confirm_new_password")}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility("confirm")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                                    tabIndex={-1}
                                >
                                    {showPasswords.confirm ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                className="bg-[#4CAF50] hover:bg-[#45a049] text-white px-6"
                                disabled={isLoading}
                            >
                                {isLoading ? t("profile.changing") : t("profile.change_password")}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
