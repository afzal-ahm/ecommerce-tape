import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Loader2,
    Truck,
    Package,
    MapPin,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Eye,
    EyeOff,
    Info,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/context/LanguageContext";

interface ShiprocketSettings {
    id: string;
    isEnabled: boolean;
    email: string | null;
    password: string | null;
    token: string | null;
    defaultLength: number;
    defaultBreadth: number;
    defaultHeight: number;
    defaultWeight: number;
}

interface PickupAddress {
    id: string;
    nickname: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    address2: string | null;
    city: string;
    state: string;
    country: string;
    pincode: string;
    isDefault: boolean;
    shiprocketPickupId: number | null;
}

export default function ShiprocketSettingsPage() {
    const { t } = useLanguage();
    const [settings, setSettings] = useState<ShiprocketSettings | null>(null);
    const [pickupAddresses, setPickupAddresses] = useState<PickupAddress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingDimensions, setIsSavingDimensions] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<PickupAddress | null>(null);

    // Form states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [defaultLength, setDefaultLength] = useState(10);
    const [defaultBreadth, setDefaultBreadth] = useState(10);
    const [defaultHeight, setDefaultHeight] = useState(10);
    const [defaultWeight, setDefaultWeight] = useState(0.5);


    // Address form states
    const [addressForm, setAddressForm] = useState({
        nickname: "Primary Warehouse",
        name: "",
        email: "",
        phone: "",
        address: "",
        address2: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
        isDefault: true,
    });

    useEffect(() => {
        fetchSettings();
        fetchPickupAddresses();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get("/api/admin/shiprocket/settings");
            if (response.data.success) {
                const data = response.data.data.settings;
                setSettings(data);
                setEmail(data.email || "");
                setPassword(data.password || "");
                setDefaultLength(data.defaultLength || 10);
                setDefaultBreadth(data.defaultBreadth || 10);
                setDefaultHeight(data.defaultHeight || 10);

                setDefaultWeight(data.defaultWeight || 0.5);
            }
        } catch (error) {
            console.error("Error fetching Shiprocket settings:", error);
            toast.error(t("shiprocket_settings.messages.save_error"));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPickupAddresses = async () => {
        try {
            const response = await api.get("/api/admin/shiprocket/pickup-addresses");
            if (response.data.success) {
                setPickupAddresses(response.data.data.addresses || []);
            }
        } catch (error) {
            console.error("Error fetching pickup addresses:", error);
        }
    };

    // Save credentials only (used by Test Connection and Toggle)
    const handleSaveSettings = async () => {
        try {
            setIsSaving(true);
            const response = await api.put("/api/admin/shiprocket/settings", {
                isEnabled: settings?.isEnabled,
                email,
                password: password !== "********" ? password : undefined,
            });

            if (response.data.success) {
                toast.success(t("shiprocket_settings.messages.save_success"));
                setSettings(response.data.data.settings);
            }
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast.error(error.response?.data?.message || t("shiprocket_settings.messages.save_error"));
        } finally {
            setIsSaving(false);
        }
    };

    // Save default shipping dimensions only
    const handleSaveDimensions = async () => {
        try {
            setIsSavingDimensions(true);
            const response = await api.put("/api/admin/shiprocket/settings", {
                defaultLength,
                defaultBreadth,
                defaultHeight,
                defaultWeight,
            });

            if (response.data.success) {
                toast.success(t("shiprocket_settings.default_dimensions.save_success"));
                setSettings(response.data.data.settings);
            }
        } catch (error: any) {
            console.error("Error saving dimensions:", error);
            toast.error(error.response?.data?.message || t("shiprocket_settings.messages.save_error"));
        } finally {
            setIsSavingDimensions(false);
        }
    };



    const handleToggle = async (enabled: boolean) => {
        if (enabled && (!email || password === "")) {
            toast.error(t("shiprocket_settings.messages.credentials_required"));
            return;
        }

        try {
            setIsSaving(true);
            const response = await api.put("/api/admin/shiprocket/settings", {
                isEnabled: enabled,
            });

            if (response.data.success) {
                setSettings(response.data.data.settings);
                toast.success(enabled ? t("shiprocket_settings.messages.enabled") : t("shiprocket_settings.messages.disabled"));
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t("shiprocket_settings.messages.save_error"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!email || password === "") {
            toast.error(t("shiprocket_settings.messages.credentials_required"));
            return;
        }

        // Save settings first
        await handleSaveSettings();

        try {
            setIsTesting(true);
            const response = await api.post("/api/admin/shiprocket/test-connection");
            if (response.data.success && response.data.data.connected) {
                toast.success(t("shiprocket_settings.connection_success"));
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t("shiprocket_settings.connection_failed"));
        } finally {
            setIsTesting(false);
        }
    };

    const handleSaveAddress = async () => {
        if (!addressForm.name || !addressForm.email || !addressForm.phone ||
            !addressForm.address || !addressForm.city || !addressForm.state || !addressForm.pincode) {
            toast.error(t("shiprocket_settings.messages.fill_required"));
            return;
        }

        try {
            setIsSaving(true);
            if (editingAddress) {
                const response = await api.put(`/api/admin/shiprocket/pickup-addresses/${editingAddress.id}`, addressForm);
                if (response.data.success) {
                    toast.success(t("shiprocket_settings.messages.address_updated"));
                }
            } else {
                const response = await api.post("/api/admin/shiprocket/pickup-addresses", addressForm);
                if (response.data.success) {
                    toast.success(t("shiprocket_settings.messages.address_created"));
                }
            }

            fetchPickupAddresses();
            setIsAddressDialogOpen(false);
            setEditingAddress(null);
            resetAddressForm();
        } catch (error: any) {
            toast.error(error.response?.data?.message || t("shiprocket_settings.messages.address_error"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm("Are you sure you want to delete this address?")) return;

        try {
            const response = await api.delete(`/api/admin/shiprocket/pickup-addresses/${id}`);
            if (response.data.success) {
                toast.success(t("shiprocket_settings.messages.address_deleted"));
                fetchPickupAddresses();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t("shiprocket_settings.messages.address_error"));
        }
    };

    const resetAddressForm = () => {
        setAddressForm({
            nickname: "Primary Warehouse",
            name: "",
            email: "",
            phone: "",
            address: "",
            address2: "",
            city: "",
            state: "",
            country: "India",
            pincode: "",
            isDefault: true,
        });
    };

    const openEditDialog = (address: PickupAddress) => {
        setEditingAddress(address);
        setAddressForm({
            nickname: address.nickname,
            name: address.name,
            email: address.email,
            phone: address.phone,
            address: address.address,
            address2: address.address2 || "",
            city: address.city,
            state: address.state,
            country: address.country,
            pincode: address.pincode,
            isDefault: address.isDefault,
        });
        setIsAddressDialogOpen(true);
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
        <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
                        {t("shiprocket_settings.title")}
                    </h1>
                    <p className="text-[#9CA3AF] text-sm mt-1.5">
                        {t("shiprocket_settings.description")}
                    </p>
                </div>
                <div className="h-px bg-[#E5E7EB]" />
            </div>

            {/* Enable/Disable Toggle */}
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#DBEAFE]">
                                <Truck className="h-6 w-6 text-[#3B82F6]" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-base font-semibold text-[#1F2937]">
                                        {t("shiprocket_settings.enable_title")}
                                    </Label>
                                    {settings?.isEnabled && (
                                        <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                                    )}
                                </div>
                                <p className="text-sm text-[#9CA3AF]">
                                    {t("shiprocket_settings.enable_desc")}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings?.isEnabled || false}
                            onCheckedChange={handleToggle}
                            disabled={isSaving}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* API Credentials */}
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
                <CardHeader className="px-6 pt-6 pb-4">
                    <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                        <Package className="h-5 w-5 mr-2 text-[#4CAF50]" />
                        {t("shiprocket_settings.api_credentials.title")}
                    </CardTitle>
                    <p className="text-sm text-[#9CA3AF] mt-1">
                        {t("shiprocket_settings.api_credentials.description")}
                    </p>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t("shiprocket_settings.api_credentials.email")} *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t("shiprocket_settings.api_credentials.email_placeholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t("shiprocket_settings.api_credentials.password")} *</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t("shiprocket_settings.api_credentials.password_placeholder")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-[#FEF3C7] border border-[#FCD34D] rounded-xl">
                        <AlertCircle className="h-5 w-5 text-[#D97706] mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-[#92400E]">
                            <p className="font-medium mb-1">{t("shiprocket_settings.how_to_get_credentials.title")}</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>{t("shiprocket_settings.how_to_get_credentials.step1")}</li>
                                <li>{t("shiprocket_settings.how_to_get_credentials.step2")}</li>
                                <li>{t("shiprocket_settings.how_to_get_credentials.step3")}</li>
                            </ol>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={isTesting || !email || !password}
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("shiprocket_settings.testing")}
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {t("shiprocket_settings.test_connection")}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Default Shipping Dimensions */}
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
                <CardHeader className="px-6 pt-6 pb-4">
                    <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                        <Package className="h-5 w-5 mr-2 text-[#4CAF50]" />
                        {t("shiprocket_settings.default_dimensions.title")}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 ml-2 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-gray-900 text-white p-3">
                                    <p className="text-sm">{t("shiprocket_settings.default_dimensions.info")}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <p className="text-sm text-[#9CA3AF] mt-1">
                        {t("shiprocket_settings.default_dimensions.description")}
                    </p>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="length">{t("shiprocket_settings.default_dimensions.length")}</Label>
                            <Input
                                id="length"
                                type="number"
                                step="0.1"
                                value={defaultLength}
                                onChange={(e) => setDefaultLength(parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="breadth">{t("shiprocket_settings.default_dimensions.breadth")}</Label>
                            <Input
                                id="breadth"
                                type="number"
                                step="0.1"
                                value={defaultBreadth}
                                onChange={(e) => setDefaultBreadth(parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="height">{t("shiprocket_settings.default_dimensions.height")}</Label>
                            <Input
                                id="height"
                                type="number"
                                step="0.1"
                                value={defaultHeight}
                                onChange={(e) => setDefaultHeight(parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="weight">{t("shiprocket_settings.default_dimensions.weight")}</Label>
                            <Input
                                id="weight"
                                type="number"
                                step="0.1"
                                value={defaultWeight}
                                onChange={(e) => setDefaultWeight(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 mt-4 border-t border-[#E5E7EB]">
                        <Button onClick={handleSaveDimensions} disabled={isSavingDimensions}>
                            {isSavingDimensions ? (
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



            {/* Pickup Addresses */}
            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
                <CardHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
                                <MapPin className="h-5 w-5 mr-2 text-[#4CAF50]" />
                                {t("shiprocket_settings.pickup_addresses.title")}
                            </CardTitle>
                            <p className="text-sm text-[#9CA3AF] mt-1">
                                {t("shiprocket_settings.pickup_addresses.description")}
                            </p>
                        </div>
                        <Dialog open={isAddressDialogOpen} onOpenChange={(open) => {
                            setIsAddressDialogOpen(open);
                            if (!open) {
                                setEditingAddress(null);
                                resetAddressForm();
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t("shiprocket_settings.pickup_addresses.add_button")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingAddress ? t("shiprocket_settings.address_form.edit_title") : t("shiprocket_settings.address_form.add_title")}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t("shiprocket_settings.address_form.nickname")}</Label>
                                            <Input
                                                value={addressForm.nickname}
                                                onChange={(e) => setAddressForm({ ...addressForm, nickname: e.target.value })}
                                                placeholder={t("shiprocket_settings.address_form.nickname_placeholder")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("shiprocket_settings.address_form.contact_name")} *</Label>
                                            <Input
                                                value={addressForm.name}
                                                onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                                                placeholder={t("shiprocket_settings.address_form.contact_placeholder")}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t("shiprocket_settings.address_form.email")} *</Label>
                                            <Input
                                                type="email"
                                                value={addressForm.email}
                                                onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                                                placeholder={t("shiprocket_settings.address_form.email_placeholder")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("shiprocket_settings.address_form.phone")} *</Label>
                                            <Input
                                                value={addressForm.phone}
                                                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                                placeholder={t("shiprocket_settings.address_form.phone_placeholder")}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("shiprocket_settings.address_form.address1")} *</Label>
                                        <Input
                                            value={addressForm.address}
                                            onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                                            placeholder={t("shiprocket_settings.address_form.address1_placeholder")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("shiprocket_settings.address_form.address2")}</Label>
                                        <Input
                                            value={addressForm.address2}
                                            onChange={(e) => setAddressForm({ ...addressForm, address2: e.target.value })}
                                            placeholder={t("shiprocket_settings.address_form.address2_placeholder")}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t("shiprocket_settings.address_form.city")} *</Label>
                                            <Input
                                                value={addressForm.city}
                                                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                                placeholder={t("shiprocket_settings.address_form.city_placeholder")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("shiprocket_settings.address_form.state")} *</Label>
                                            <Input
                                                value={addressForm.state}
                                                onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                                                placeholder={t("shiprocket_settings.address_form.state_placeholder")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("shiprocket_settings.address_form.pincode")} *</Label>
                                            <Input
                                                value={addressForm.pincode}
                                                onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                                                placeholder={t("shiprocket_settings.address_form.pincode_placeholder")}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={addressForm.isDefault}
                                            onCheckedChange={(checked) => setAddressForm({ ...addressForm, isDefault: checked })}
                                        />
                                        <Label>{t("shiprocket_settings.address_form.set_default")}</Label>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button variant="outline" onClick={() => setIsAddressDialogOpen(false)}>
                                            {t("shiprocket_settings.buttons.cancel")}
                                        </Button>
                                        <Button onClick={handleSaveAddress} disabled={isSaving}>
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {t("shiprocket_settings.buttons.saving")}
                                                </>
                                            ) : (
                                                editingAddress ? t("shiprocket_settings.buttons.update_address") : t("shiprocket_settings.buttons.add_address")
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    {pickupAddresses.length === 0 ? (
                        <div className="text-center py-8 text-[#9CA3AF]">
                            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>{t("shiprocket_settings.pickup_addresses.no_addresses")}</p>
                            <p className="text-sm">{t("shiprocket_settings.pickup_addresses.add_hint")}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {pickupAddresses.map((address) => (
                                <div
                                    key={address.id}
                                    className="flex items-start justify-between p-4 border border-[#E5E7EB] rounded-xl hover:border-[#4CAF50] transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F3F4F6] flex-shrink-0">
                                            <MapPin className="h-5 w-5 text-[#6B7280]" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-[#1F2937]">{address.nickname}</span>
                                                {address.isDefault && (
                                                    <span className="text-xs bg-[#ECFDF5] text-[#22C55E] px-2 py-0.5 rounded-full">
                                                        {t("shiprocket_settings.pickup_addresses.default_badge")}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-[#6B7280] mt-1">
                                                {address.name} • {address.phone}
                                            </p>
                                            <p className="text-sm text-[#9CA3AF]">
                                                {address.address}, {address.city}, {address.state} - {address.pincode}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(address)}
                                        >
                                            {t("shiprocket_settings.pickup_addresses.edit")}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDeleteAddress(address.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
