import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    Eye,
    EyeOff,
    CheckCircle2,
    Info,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function PriceVisibilitySettingsPage() {
    const { admin } = useAuth();
    const { t } = useLanguage();
    const [hidePricesForGuests, setHidePricesForGuests] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPriceVisibilitySettings();
    }, [admin]);

    const fetchPriceVisibilitySettings = async () => {
        try {
            setIsLoading(true);

            const response = await api.get("/api/admin/price-visibility-settings");


            if (response.data.success) {
                setHidePricesForGuests(response.data.data.hidePricesForGuests ?? false);
            }
        } catch (error: any) {
            console.error("Error fetching price visibility settings:", error);
            toast.error(t('price_visibility.messages.load_error') + ": " + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setIsSaving(true);

            const response = await api.patch("/api/admin/price-visibility-settings", {
                hidePricesForGuests,
            });

            if (response.data.success) {
                toast.success(t('price_visibility.messages.save_success'));
            }
        } catch (error: any) {
            console.error("Error updating price visibility settings:", error);
            toast.error(error.response?.data?.message || error.message || "Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#4CAF50]" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
                            {t('price_visibility.title')}
                        </h1>
                        <p className="text-[#9CA3AF] text-sm mt-1.5">
                            {t('price_visibility.description')}
                        </p>
                    </div>
                </div>
                <div className="h-px bg-[#E5E7EB]" />
            </div>

            {/* Settings Card */}
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
                <CardHeader className="px-6 pt-6 pb-4">
                    <CardTitle className="text-xl font-semibold text-[#1F2937] flex items-center gap-2">
                        <Eye className="h-6 w-6 text-[#4CAF50]" />
                        {t('price_visibility.card_title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-6">
                    {/* Hide Prices for Guests Toggle */}
                    <div className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB]">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium text-[#1F2937]">
                                    {t('price_visibility.hide_guests')}
                                </Label>
                                {hidePricesForGuests ? (
                                    <EyeOff className="h-4 w-4 text-[#EF4444]" />
                                ) : (
                                    <Eye className="h-4 w-4 text-[#4CAF50]" />
                                )}
                            </div>
                            <p className="text-xs text-[#6B7280]">
                                {t('price_visibility.hide_guests_desc')}
                            </p>
                        </div>
                        <Switch
                            checked={hidePricesForGuests}
                            onCheckedChange={setHidePricesForGuests}
                            className="data-[state=checked]:bg-[#4CAF50]"
                        />
                    </div>

                    {/* Information Box */}
                    <div className="p-4 border border-[#DBEAFE] rounded-lg bg-[#EFF6FF]">
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-[#1E40AF]">
                                    {t('price_visibility.info_title')}
                                </h4>
                                <ul className="text-xs text-[#3730A3] space-y-1">
                                    <li>{t('price_visibility.info_list.1')}</li>
                                    <li>{t('price_visibility.info_list.2')}</li>
                                    <li>{t('price_visibility.info_list.3')}</li>
                                    <li>{t('price_visibility.info_list.4')}</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Current Status */}
                    <div className="flex items-center gap-2 p-3 border border-[#E5E7EB] rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-[#4CAF50]" />
                        <span className="text-sm text-[#374151]">
                            {t('price_visibility.current_status')} {hidePricesForGuests ? t('price_visibility.status_hidden') : t('price_visibility.status_visible')}
                        </span>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className="bg-[#4CAF50] hover:bg-[#45a049] text-white px-6"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    {t('price_visibility.saving')}
                                </>
                            ) : (
                                t('price_visibility.save_button')
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}