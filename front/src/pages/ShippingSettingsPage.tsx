import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Loader2,
    Truck,
    Info,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/context/LanguageContext";

export default function ShippingSettingsPage() {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [shippingCharge, setShippingCharge] = useState(0);
    const [freeShippingThreshold, setFreeShippingThreshold] = useState(0);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get("/api/admin/shiprocket/settings");
            if (response.data.success) {
                const data = response.data.data.settings;
                setShippingCharge(data.shippingCharge ? parseFloat(data.shippingCharge) : 0);
                setFreeShippingThreshold(data.freeShippingThreshold ? parseFloat(data.freeShippingThreshold) : 0);
            }
        } catch (error) {
            console.error("Error fetching shipping settings:", error);
            toast.error(t("shiprocket_settings.messages.save_error"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const response = await api.put("/api/admin/shiprocket/settings", {
                shippingCharge,
                freeShippingThreshold,
            });

            if (response.data.success) {
                toast.success(t("shiprocket_settings.shipping_charges.save_success"));
            }
        } catch (error: any) {
            console.error("Error saving shipping charges:", error);
            toast.error(error.response?.data?.message || t("shiprocket_settings.messages.save_error"));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
                    <p className="mt-4 text-base text-[#9CA3AF]">{t("shiprocket_settings.messages.loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
                        Shipping Settings
                    </h1>
                    <p className="text-[#9CA3AF] text-sm mt-1.5">
                        {t("shiprocket_settings.shipping_charges.description")}
                    </p>
                </div>
                <div className="h-px bg-[#E5E7EB]" />
            </div>

            {/* Shipping Charges Card */}
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
                <CardHeader className="px-6 pt-6 pb-4">
                    <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                        <Truck className="h-5 w-5 mr-2 text-[#4CAF50]" />
                        {t("shiprocket_settings.shipping_charges.title")}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 ml-2 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-gray-900 text-white p-3">
                                    <p className="text-sm">{t("shiprocket_settings.shipping_charges.info")}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <p className="text-sm text-[#9CA3AF] mt-1">
                        {t("shiprocket_settings.shipping_charges.description")}
                    </p>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="shippingCharge">{t("shiprocket_settings.shipping_charges.charge_label")}</Label>
                            <Input
                                id="shippingCharge"
                                type="number"
                                min="0"
                                value={shippingCharge}
                                onChange={(e) => setShippingCharge(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="freeShippingThreshold">{t("shiprocket_settings.shipping_charges.threshold_label")}</Label>
                            <Input
                                id="freeShippingThreshold"
                                type="number"
                                min="0"
                                value={freeShippingThreshold}
                                onChange={(e) => setFreeShippingThreshold(parseFloat(e.target.value) || 0)}
                            />
                            <p className="text-xs text-[#9CA3AF] mt-1">
                                {t("shiprocket_settings.shipping_charges.threshold_hint")}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 mt-4 border-t border-[#E5E7EB]">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("shiprocket_settings.buttons.saving")}
                                </>
                            ) : (
                                t("shiprocket_settings.buttons.save")
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
