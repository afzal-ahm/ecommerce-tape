import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Loader2,
    Settings,
    AlertCircle,
    CheckCircle2,
    Info,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { useLanguage } from "@/context/LanguageContext";

export default function MOQSettingsPage() {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [minQuantity, setMinQuantity] = useState(1);

    useEffect(() => {
        fetchGlobalMOQ();
    }, []);

    const fetchGlobalMOQ = async () => {
        try {
            setIsLoading(true);
            const response = await api.get("/api/admin/moq/global");

            if (response.data.success) {
                const moq = response.data.data;
                if (moq) {
                    setIsActive(moq.isActive);
                    setMinQuantity(moq.minQuantity);
                } else {
                    setIsActive(false);
                    setMinQuantity(1);
                }
            } else {
                toast.error(response.data.message || "Failed to fetch MOQ settings");
            }
        } catch (error: any) {
            console.error("Error fetching MOQ settings:", error);
            if (error.response?.status !== 404) {
                toast.error(
                    error.response?.data?.message || "Failed to load MOQ settings"
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (isActive && (!minQuantity || minQuantity < 1)) {
            toast.error(t('moq_settings.messages.validation_error'));
            return;
        }

        try {
            setIsSaving(true);
            const response = await api.post("/api/admin/moq/global", {
                minQuantity: isActive ? minQuantity : 1,
                isActive,
            });

            if (response.data.success) {
                toast.success(t('moq_settings.messages.save_success'));
            } else {
                toast.error(response.data.message || t('moq_settings.messages.save_error'));
            }
        } catch (error: any) {
            console.error("Error updating MOQ settings:", error);
            const errorMessage =
                error.response?.data?.message || t('moq_settings.messages.save_error');
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
                    {t('moq_settings.title')}
                </h1>
                <p className="text-[#9CA3AF] text-sm mt-1.5">
                    {t('moq_settings.description')}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {t('moq_settings.card_title')}
                    </CardTitle>
                    <CardDescription>
                        {t('moq_settings.card_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="moq-enabled" className="text-base font-medium">
                                {t('moq_settings.enable')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {t('moq_settings.enable_desc')}
                            </p>
                        </div>
                        <Switch
                            id="moq-enabled"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                    </div>

                    {/* Minimum Quantity Input */}
                    {isActive && (
                        <div className="space-y-2">
                            <Label htmlFor="min-quantity">
                                {t('moq_settings.min_qty_label')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="min-quantity"
                                type="number"
                                min="1"
                                value={minQuantity}
                                onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
                                placeholder="Enter minimum quantity"
                                className="max-w-xs"
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('moq_settings.min_qty_desc')}
                            </p>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-900">
                                {t('moq_settings.info_title')}
                            </p>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>{t('moq_settings.info_list.1')}</li>
                                <li>{t('moq_settings.info_list.2')}</li>
                                <li>{t('moq_settings.info_list.3')}</li>
                            </ul>
                        </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                        {isActive ? (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium">
                                    {t('moq_settings.status.active')} {minQuantity}
                                </span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-5 w-5 text-gray-500" />
                                <span className="text-sm font-medium text-muted-foreground">
                                    {t('moq_settings.status.disabled')}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => fetchGlobalMOQ()}
                            disabled={isSaving}
                        >
                            {t('moq_settings.reset')}
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('moq_settings.saving')}
                                </>
                            ) : (
                                t('moq_settings.save_button')
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

