import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    CreditCard,
    Smartphone,
    Info,
    Eye,
    EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface PaymentGatewaySetting {
    id: string;
    gateway: "RAZORPAY" | "PHONEPE";
    isActive: boolean;
    mode: "TEST" | "LIVE";
    razorpayKeyId?: string | null;
    razorpayKeySecret?: string | null;
    razorpayWebhookSecret?: string | null;
    phonepeMerchantId?: string | null;
    phonepeSaltKey?: string | null;
    phonepeSaltIndex?: string | null;
}

export default function PaymentGatewaySettingsPage() {
    const { admin } = useAuth();
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [razorpaySettings, setRazorpaySettings] = useState<PaymentGatewaySetting | null>(null);
    const [phonepeSettings, setPhonepeSettings] = useState<PaymentGatewaySetting | null>(null);

    // Razorpay form state
    const [razorpayForm, setRazorpayForm] = useState({
        isActive: false,
        mode: "TEST" as "TEST" | "LIVE",
        keyId: "",
        keySecret: "",
        webhookSecret: "",
    });

    // PhonePe form state
    const [phonepeForm, setPhonepeForm] = useState({
        isActive: false,
        mode: "TEST" as "TEST" | "LIVE",
        merchantId: "",
        saltKey: "",
        saltIndex: "",
    });

    // Show/hide secrets
    const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
    const [showRazorpayWebhook, setShowRazorpayWebhook] = useState(false);
    const [showPhonepeSalt, setShowPhonepeSalt] = useState(false);

    useEffect(() => {
        if (admin) {
            fetchSettings();
        }
    }, [admin]);

    const fetchSettings = async () => {
        if (!admin) return;

        try {
            setIsLoading(true);
            const response = await api.get(`/api/admin/payment-gateway-settings/${admin.id}`);

            if (response.data.success) {
                const settings = response.data.data || [];

                const razorpay = settings.find((s: PaymentGatewaySetting) => s.gateway === "RAZORPAY");
                const phonepe = settings.find((s: PaymentGatewaySetting) => s.gateway === "PHONEPE");

                if (razorpay) {
                    setRazorpaySettings(razorpay);
                    setRazorpayForm({
                        isActive: razorpay.isActive,
                        mode: razorpay.mode,
                        keyId: razorpay.razorpayKeyId || "",
                        keySecret: razorpay.razorpayKeySecret || "",
                        webhookSecret: razorpay.razorpayWebhookSecret || "",
                    });
                }

                if (phonepe) {
                    setPhonepeSettings(phonepe);
                    setPhonepeForm({
                        isActive: phonepe.isActive,
                        mode: phonepe.mode,
                        merchantId: phonepe.phonepeMerchantId || "",
                        saltKey: phonepe.phonepeSaltKey || "",
                        saltIndex: phonepe.phonepeSaltIndex || "",
                    });
                }
            }
        } catch (error: any) {
            console.error("Error fetching payment gateway settings:", error);
            if (error.response?.status !== 404) {
                toast.error("Failed to load payment gateway settings");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRazorpay = async () => {
        if (!admin) return;

        if (razorpayForm.isActive && (!razorpayForm.keyId || !razorpayForm.keySecret)) {
            toast.error("Key ID and Key Secret are required when Razorpay is enabled");
            return;
        }

        try {
            setIsSaving(true);
            const response = await api.post(
                `/api/admin/payment-gateway-settings/${admin.id}`,
                {
                    gateway: "RAZORPAY",
                    isActive: razorpayForm.isActive,
                    mode: razorpayForm.mode,
                    razorpayKeyId: razorpayForm.keyId || null,
                    razorpayKeySecret: razorpayForm.keySecret || null,
                    razorpayWebhookSecret: razorpayForm.webhookSecret || null,
                }
            );

            if (response.data.success) {
                toast.success(t('payment_gateway_settings.razorpay.success'));
                fetchSettings();
                // Trigger window event to notify Payment Settings page
                window.dispatchEvent(new Event("paymentGatewayUpdated"));
            } else {
                toast.error(response.data.message || "Failed to save Razorpay settings");
            }
        } catch (error: any) {
            console.error("Error saving Razorpay settings:", error);
            toast.error(
                error.response?.data?.message || "Failed to save Razorpay settings"
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePhonepe = async () => {
        if (!admin) return;

        if (
            phonepeForm.isActive &&
            (!phonepeForm.merchantId || !phonepeForm.saltKey || !phonepeForm.saltIndex)
        ) {
            toast.error(
                "Merchant ID, Salt Key, and Salt Index are required when PhonePe is enabled"
            );
            return;
        }

        try {
            setIsSaving(true);
            const response = await api.post(
                `/api/admin/payment-gateway-settings/${admin.id}`,
                {
                    gateway: "PHONEPE",
                    isActive: phonepeForm.isActive,
                    mode: phonepeForm.mode,
                    phonepeMerchantId: phonepeForm.merchantId || null,
                    phonepeSaltKey: phonepeForm.saltKey || null,
                    phonepeSaltIndex: phonepeForm.saltIndex || null,
                }
            );

            if (response.data.success) {
                toast.success("PhonePe settings saved successfully");
                fetchSettings();
                // Trigger window event to notify Payment Settings page
                window.dispatchEvent(new Event("paymentGatewayUpdated"));
            } else {
                toast.error(response.data.message || "Failed to save PhonePe settings");
            }
        } catch (error: any) {
            console.error("Error saving PhonePe settings:", error);
            toast.error(
                error.response?.data?.message || "Failed to save PhonePe settings"
            );
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
                    {t('payment_gateway_settings.title')}
                </h1>
                <p className="text-[#9CA3AF] text-sm mt-1.5">
                    {t('payment_gateway_settings.description')}
                </p>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-900">
                                {t('payment_gateway_settings.info_title')}
                            </p>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>{t('payment_gateway_settings.info_list.1')}</li>
                                <li>{t('payment_gateway_settings.info_list.2')}</li>
                                <li>{t('payment_gateway_settings.info_list.3')}</li>
                                <li>{t('payment_gateway_settings.info_list.4')}</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Razorpay Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        {t('payment_gateway_settings.razorpay.title')}
                    </CardTitle>
                    <CardDescription>
                        {t('payment_gateway_settings.razorpay.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="razorpay-enabled" className="text-base font-medium">
                                {t('payment_gateway_settings.razorpay.enable')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {t('payment_gateway_settings.razorpay.enable_desc')}
                            </p>
                        </div>
                        <Switch
                            id="razorpay-enabled"
                            checked={razorpayForm.isActive}
                            onCheckedChange={(checked) =>
                                setRazorpayForm({ ...razorpayForm, isActive: checked })
                            }
                        />
                    </div>

                    {razorpayForm.isActive && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="razorpay-mode">{t('payment_gateway_settings.razorpay.mode')}</Label>
                                <Select
                                    value={razorpayForm.mode}
                                    onValueChange={(value: "TEST" | "LIVE") =>
                                        setRazorpayForm({ ...razorpayForm, mode: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TEST">{t('payment_gateway_settings.razorpay.test_mode')}</SelectItem>
                                        <SelectItem value="LIVE">{t('payment_gateway_settings.razorpay.live_mode')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">
                                    {t('payment_gateway_settings.razorpay.mode_desc')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="razorpay-key-id">
                                    {t('payment_gateway_settings.razorpay.key_id')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="razorpay-key-id"
                                    value={razorpayForm.keyId}
                                    onChange={(e) =>
                                        setRazorpayForm({ ...razorpayForm, keyId: e.target.value })
                                    }
                                    placeholder="rzp_test_xxxxx or rzp_live_xxxxx"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="razorpay-key-secret">
                                    {t('payment_gateway_settings.razorpay.key_secret')} <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="razorpay-key-secret"
                                        type={showRazorpaySecret ? "text" : "password"}
                                        value={razorpayForm.keySecret}
                                        onChange={(e) =>
                                            setRazorpayForm({ ...razorpayForm, keySecret: e.target.value })
                                        }
                                        placeholder={razorpaySettings?.razorpayKeySecret ? "Enter new key or leave to keep existing" : "Enter key secret"}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full"
                                        onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                                    >
                                        {showRazorpaySecret ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                {razorpaySettings?.razorpayKeySecret && (
                                    <p className="text-xs text-muted-foreground">
                                        Current: {razorpaySettings.razorpayKeySecret} (Leave empty to keep existing)
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="razorpay-webhook-secret">{t('payment_gateway_settings.razorpay.webhook_secret')}</Label>
                                <div className="relative">
                                    <Input
                                        id="razorpay-webhook-secret"
                                        type={showRazorpayWebhook ? "text" : "password"}
                                        value={razorpayForm.webhookSecret}
                                        onChange={(e) =>
                                            setRazorpayForm({ ...razorpayForm, webhookSecret: e.target.value })
                                        }
                                        placeholder={razorpaySettings?.razorpayWebhookSecret ? "Enter new webhook secret or leave to keep existing" : "Enter webhook secret"}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full"
                                        onClick={() => setShowRazorpayWebhook(!showRazorpayWebhook)}
                                    >
                                        {showRazorpayWebhook ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                {razorpaySettings?.razorpayWebhookSecret && (
                                    <p className="text-xs text-muted-foreground">
                                        Current: {razorpaySettings.razorpayWebhookSecret} (Leave empty to keep existing)
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => fetchSettings()}
                            disabled={isSaving}
                        >
                            {t('payment_gateway_settings.razorpay.reset')}
                        </Button>
                        <Button onClick={handleSaveRazorpay} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('payment_gateway_settings.razorpay.saving')}
                                </>
                            ) : (
                                t('payment_gateway_settings.razorpay.save_button')
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* PhonePe Settings - Hidden for now */}
            {false && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            {t('payment_gateway_settings.phonepe.title')}
                        </CardTitle>
                        <CardDescription>
                            Configure your PhonePe payment gateway keys.
                            <br />
                            <span className="text-xs text-muted-foreground mt-1 block">
                                Development: Use Merchant ID (Client ID), Salt Key (Client Secret), and Salt Index from PhonePe dashboard.
                                <br />
                                Production: Use the same structure with your production credentials.
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label htmlFor="phonepe-enabled" className="text-base font-medium">
                                    Enable PhonePe
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Activate PhonePe payment gateway
                                </p>
                            </div>
                            <Switch
                                id="phonepe-enabled"
                                checked={phonepeForm.isActive}
                                onCheckedChange={(checked) =>
                                    setPhonepeForm({ ...phonepeForm, isActive: checked })
                                }
                            />
                        </div>

                        {phonepeForm.isActive && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="phonepe-mode">Payment Mode</Label>
                                    <Select
                                        value={phonepeForm.mode}
                                        onValueChange={(value: "TEST" | "LIVE") =>
                                            setPhonepeForm({ ...phonepeForm, mode: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TEST">Test Mode</SelectItem>
                                            <SelectItem value="LIVE">Live Mode</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phonepe-merchant-id">
                                        Merchant ID (Client ID) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="phonepe-merchant-id"
                                        value={phonepeForm.merchantId}
                                        onChange={(e) =>
                                            setPhonepeForm({ ...phonepeForm, merchantId: e.target.value })
                                        }
                                        placeholder="Enter PhonePe Merchant ID (Client ID)"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        This is your PhonePe Merchant ID (also called Client ID in development)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phonepe-salt-key">
                                        Salt Key (Client Secret) <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="phonepe-salt-key"
                                            type={showPhonepeSalt ? "text" : "password"}
                                            value={phonepeForm.saltKey}
                                            onChange={(e) =>
                                                setPhonepeForm({ ...phonepeForm, saltKey: e.target.value })
                                            }
                                            placeholder={phonepeSettings?.phonepeSaltKey ? "Enter new salt key or leave to keep existing" : "Enter Salt Key (Client Secret)"}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full"
                                            onClick={() => setShowPhonepeSalt(!showPhonepeSalt)}
                                        >
                                            {showPhonepeSalt ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        This is your PhonePe Salt Key (also called Client Secret in development)
                                    </p>
                                    {phonepeSettings?.phonepeSaltKey && (
                                        <p className="text-xs text-amber-600">
                                            Current: {phonepeSettings?.phonepeSaltKey} (Leave empty to keep existing)
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phonepe-salt-index">
                                        Salt Index <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="phonepe-salt-index"
                                        value={phonepeForm.saltIndex}
                                        onChange={(e) =>
                                            setPhonepeForm({ ...phonepeForm, saltIndex: e.target.value })
                                        }
                                        placeholder="Enter salt index (usually 1)"
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => fetchSettings()}
                                disabled={isSaving}
                            >
                                Reset
                            </Button>
                            <Button onClick={handleSavePhonepe} disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('payment_gateway_settings.razorpay.saving')}
                                    </>
                                ) : (
                                    t('payment_gateway_settings.phonepe.save_button')
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

