import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Calendar,
    Mail,
    Phone,
    MapPin,
    IndianRupee,
    TrendingUp,
    Clock,
    CheckCircle,
    Filter,
    Download,
    Eye,
    AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { partners } from "@/api/adminService";
import { useLanguage } from "@/context/LanguageContext";

interface MonthlyEarning {
    id: string;
    year: number;
    month: number;
    totalAmount: number;
    totalOrders: number;
    paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED';
    paidAt?: string;
    paidBy?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

interface PartnerCoupon {
    id: string;
    code: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minOrderAmount?: number;
    maxUses?: number;
    usedCount?: number;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    isDiscountCapped?: boolean;
    commission: number;
    assignedAt: string;
    createdAt: string;
}

interface PartnerDetails {
    id: string;
    name: string;
    email: string;
    number: string;
    city: string;
    state: string;
    isActive: boolean;
    commissionRate: number;
    registeredAt: string;
    monthlyEarnings: MonthlyEarning[];
    coupons?: PartnerCoupon[];
    totalEarnings: number;
    pendingAmount: number;
    paidAmount: number;
    totalOrders: number;
}

export default function PartnerDetailsPage() {
    const { t } = useLanguage();
    const { id } = useParams();
    const navigate = useNavigate();
    const [partner, setPartner] = useState<PartnerDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [paymentNotes, setPaymentNotes] = useState<string>("");
    const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);

    // Add a refresh function
    const refreshPartnerData = async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            const response = await partners.getPartnerById(id);
            console.log("Refreshed partner data:", response.data);

            if (response.data.success) {
                setPartner(response.data.data);
            } else {
                toast.error(t('partner_management.details.toasts.refresh_error') || "Failed to refresh partner details");
            }
        } catch (error) {
            console.error("Error refreshing partner data:", error);
            toast.error(t('partner_management.details.toasts.refresh_error') || "Failed to refresh partner data");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch partner details
    useEffect(() => {
        if (!id) return;

        const fetchPartnerDetails = async () => {
            try {
                setIsLoading(true);
                const response = await partners.getPartnerById(id);

                if (response.data.success) {
                    setPartner(response.data.data);
                } else {
                    toast.error(t('partner_management.details.toasts.fetch_error') || "Failed to fetch partner details");
                    navigate("/partners");
                }
            } catch (error) {
                console.error("Error fetching partner details:", error);
                toast.error(t('partner_management.details.toasts.load_error') || "Failed to load partner details");
                navigate("/partners");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPartnerDetails();
    }, [id, navigate, t]);

    // Mark payment as paid
    const handleMarkAsPaid = async (earningId: string, year: number, month: number) => {
        if (!paymentNotes.trim()) {
            toast.error(t('partner_management.details.toasts.notes_required') || "Please add payment notes");
            return;
        }

        try {
            setIsProcessingPayment(earningId);
            const response = await partners.markPaymentAsPaid(earningId, {
                notes: paymentNotes,
                year,
                month
            });

            if (response.data.success) {
                toast.success(t('partner_management.details.toasts.payment_success') || "Payment marked as paid successfully");
                setPaymentNotes("");

                // Update the local state immediately
                setPartner(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        monthlyEarnings: prev.monthlyEarnings.map(earning =>
                            earning.id === earningId
                                ? {
                                    ...earning,
                                    paymentStatus: 'PAID' as const,
                                    notes: paymentNotes,
                                    paidAt: new Date().toISOString()
                                }
                                : earning
                        )
                    };
                });

                // Also refresh from server to get any other updates
                setTimeout(() => refreshPartnerData(), 1000);
            } else {
                toast.error(response.data.message || t('partner_management.details.toasts.payment_error') || "Failed to update payment status");
            }
        } catch (error) {
            console.error("Error updating payment status:", error);
            toast.error(t('partner_management.details.toasts.payment_error') || "Failed to update payment status");
        } finally {
            setIsProcessingPayment(null);
        }
    };

    // Get month name
    const getMonthName = (month: number) => {
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return months[month - 1]; // You might want to translate months later or use Intl.DateTimeFormat
    };

    // Filter monthly earnings
    const filteredEarnings = partner?.monthlyEarnings?.filter(earning => {
        if (selectedYear && earning.year !== selectedYear) return false;
        if (selectedMonth && earning.month !== selectedMonth) return false;
        return true;
    }) || [];

    // Get available years
    const availableYears = [...new Set(partner?.monthlyEarnings?.map(e => e.year) || [])].sort((a, b) => b - a);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center py-10">
                <div className="flex flex-col items-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                    <p className="mt-4 text-lg text-gray-600">{t('contact_management.loading')}</p>
                </div>
            </div>
        );
    }

    if (!partner) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-10">
                <AlertTriangle className="h-16 w-16 text-red-500" />
                <h2 className="mt-4 text-xl font-semibold">{t('partner_management.details.not_found.title')}</h2>
                <p className="text-gray-600">{t('partner_management.details.not_found.description')}</p>
                <Button className="mt-4" onClick={() => navigate("/partner")}>
                    {t('partner_management.details.back_button')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/partner")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('partner_management.details.back_button')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={refreshPartnerData}>
                        {t('partner_management.details.refresh_button')}
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{partner.name}</h1>
                        <p className="text-gray-600">{t('partner_management.details.header_subtitle')}</p>
                    </div>
                </div>
                <Badge variant={partner.isActive ? "default" : "secondary"}>
                    {partner.isActive ? t('partner_management.details.badges.active') : t('partner_management.details.badges.inactive')}
                </Badge>
            </div>

            {/* Partner Info Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <IndianRupee className="h-8 w-8 text-green-600" />
                        <div>
                            <p className="text-sm text-gray-600">{t('partner_management.details.stats.total_earnings')}</p>
                            <p className="text-2xl font-bold">₹{partner.totalEarnings?.toLocaleString() || 0}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-orange-600" />
                        <div>
                            <p className="text-sm text-gray-600">{t('partner_management.details.stats.pending_amount')}</p>
                            <p className="text-2xl font-bold">₹{partner.pendingAmount?.toLocaleString() || 0}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-blue-600" />
                        <div>
                            <p className="text-sm text-gray-600">{t('partner_management.details.stats.paid_amount')}</p>
                            <p className="text-2xl font-bold">₹{partner.paidAmount?.toLocaleString() || 0}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                        <div>
                            <p className="text-sm text-gray-600">{t('partner_management.details.stats.total_orders')}</p>
                            <p className="text-2xl font-bold">{partner.totalOrders || 0}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Partner Details */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">{t('partner_management.details.info.title')}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{t('partner_management.details.info.email')}:</span>
                        <span className="font-medium">{partner.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{t('partner_management.details.info.phone')}:</span>
                        <span className="font-medium">{partner.number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{t('partner_management.details.info.location')}:</span>
                        <span className="font-medium">{partner.city}, {partner.state}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{t('partner_management.details.info.commission_rate')}:</span>
                        <span className="font-medium">{partner.commissionRate}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{t('partner_management.details.info.registered')}:</span>
                        <span className="font-medium">{new Date(partner.registeredAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </Card>

            {/* Partner Coupons */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">{t('partner_management.details.coupons.title')}</h2>
                {partner.coupons && partner.coupons.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {partner.coupons.map((coupon) => (
                            <Card key={coupon.id} className="p-4 border-l-4 border-l-blue-500">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Badge variant={coupon.isActive ? "default" : "secondary"}>
                                            {coupon.code}
                                        </Badge>
                                        <Badge variant="outline" className="text-green-600">
                                            {coupon.commission}% {t('partner_management.details.coupons.commission')}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">{coupon.description}</p>
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <div>
                                            <span className="font-medium">{t('partner_management.details.coupons.discount')}:</span>
                                            {coupon.discountType === 'PERCENTAGE'
                                                ? ` ${coupon.discountValue}%`
                                                : ` ₹${coupon.discountValue}`}
                                        </div>
                                        {coupon.minOrderAmount && (
                                            <div>
                                                <span className="font-medium">{t('partner_management.details.coupons.min_order')}:</span> ₹{coupon.minOrderAmount}
                                            </div>
                                        )}
                                        <div>
                                            <span className="font-medium">{t('partner_management.details.coupons.used')}:</span> {coupon.usedCount || 0}
                                            {coupon.maxUses && ` / ${coupon.maxUses}`}
                                        </div>
                                        {coupon.endDate && (
                                            <div>
                                                <span className="font-medium">{t('partner_management.details.coupons.valid_until')}:</span> {new Date(coupon.endDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>{t('partner_management.details.coupons.empty')}</p>
                    </div>
                )}
            </Card>

            {/* Monthly Earnings */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">{t('partner_management.details.earnings.title')}</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <select
                                value={selectedYear || ""}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="border rounded px-3 py-1 text-sm"
                            >
                                <option value="">{t('partner_management.details.earnings.filters.all_years')}</option>
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <select
                            value={selectedMonth || ""}
                            onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
                            className="border rounded px-3 py-1 text-sm"
                        >
                            <option value="">{t('partner_management.details.earnings.filters.all_months')}</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month}>{getMonthName(month)}</option>
                            ))}
                        </select>
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            {t('partner_management.details.earnings.filters.export')}
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="px-4 py-3 text-left text-sm font-medium">{t('partner_management.details.earnings.table.month')}</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">{t('partner_management.details.earnings.table.orders')}</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">{t('partner_management.details.earnings.table.amount')}</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">{t('partner_management.details.earnings.table.status')}</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">{t('partner_management.details.earnings.table.paid_date')}</th>
                                <th className="px-4 py-3 text-right text-sm font-medium">{t('partner_management.details.earnings.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEarnings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        {t('partner_management.details.earnings.table.empty')}
                                    </td>
                                </tr>
                            ) : (
                                filteredEarnings.map((earning) => (
                                    <tr key={earning.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">
                                                {getMonthName(earning.month)} {earning.year}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{earning.totalOrders}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">₹{earning.totalAmount.toLocaleString()}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    earning.paymentStatus === 'PAID' ? 'default' :
                                                        earning.paymentStatus === 'PENDING' ? 'secondary' : 'destructive'
                                                }
                                            >
                                                {earning.paymentStatus}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {earning.paidAt ? new Date(earning.paidAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {earning.paymentStatus === 'PENDING' && (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <Input
                                                        placeholder={t('partner_management.details.earnings.payment_notes_placeholder')}
                                                        value={paymentNotes}
                                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                                        className="w-32 text-xs"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleMarkAsPaid(earning.id, earning.year, earning.month)}
                                                        disabled={isProcessingPayment === earning.id}
                                                    >
                                                        {isProcessingPayment === earning.id ? (
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                        ) : (
                                                            <CheckCircle className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                            {earning.paymentStatus === 'PAID' && earning.notes && (
                                                <Button variant="ghost" size="sm" title={earning.notes}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
