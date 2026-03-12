import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import { Link } from "react-router-dom";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Trash2, UserMinus, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_URL = import.meta.env.VITE_API_URL;

type ApprovedPartner = {
    id: string;
    name: string;
    email: string;
    number: string;
    status: string;
    monthlyEarnings: number;
    totalEarnings: number;
    registeredAt: string;
    message?: string; // Added message field
    coupons: Array<{
        id: string;
        code: string;
        description?: string;
    }>;
    earnings: {
        total: number;
        monthly: Record<string, number>;
    };
};

export default function ApprovedPartnersTab() {
    const { t } = useLanguage();
    const [partners, setPartners] = useState<ApprovedPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Details dialog state
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<ApprovedPartner | null>(null);


    // Remove coupon state
    const [removingCouponId, setRemovingCouponId] = useState<string | null>(null);
    const [removeCouponError, setRemoveCouponError] = useState("");

    // Remove partner state
    const [removingPartnerId, setRemovingPartnerId] = useState<string | null>(null); useEffect(() => {
        async function fetchApprovedPartners() {
            try {
                const res = await axios.get(`${API_URL}/api/admin/partners/approved`);
                setPartners(res.data.data || []);
            } catch {
                setError(t("reviews.messages.fetch_error"));
            }
            setLoading(false);
        }
        fetchApprovedPartners();
    }, []);



    const handleRemoveCoupon = async (partnerId: string, couponId: string) => {
        if (!window.confirm(t("partners_tab.approved.confirm_remove_coupon"))) return;
        setRemovingCouponId(couponId);
        setRemoveCouponError("");
        try {
            await axios.delete(`${API_URL}/api/admin/partners/${partnerId}/coupons/${couponId}`);
            // Update the selected partner's coupons
            setSelectedPartner(prev => prev ? {
                ...prev,
                coupons: prev.coupons.filter(c => c.id !== couponId)
            } : prev);
            // Also update in the main partners list
            setPartners(prev => prev.map(p => p.id === partnerId ? {
                ...p,
                coupons: p.coupons.filter(c => c.id !== couponId)
            } : p));
        } catch {
            setRemoveCouponError(t("partners_tab.approved.remove_coupon_error"));
        } finally {
            setRemovingCouponId(null);
        }
    };

    const handleRemovePartner = async (partnerId: string) => {
        if (!window.confirm(t("partners_tab.approved.confirm_deactivate"))) return;
        setRemovingPartnerId(partnerId);
        try {
            await axios.post(`${API_URL}/api/admin/partners/${partnerId}/deactivate`);
            // Remove from the list
            setPartners(prev => prev.filter(p => p.id !== partnerId));
            setDetailsDialogOpen(false);
            alert(t("partners_tab.approved.deactivate_success"));
        } catch {
            alert(t("partners_tab.approved.deactivate_error"));
        } finally {
            setRemovingPartnerId(null);
        }
    };

    if (loading) {
        return <div className="text-center py-10 text-muted-foreground">{t("partners_tab.common.loading")}</div>;
    }

    if (error) {
        return <div className="text-red-600 text-center py-10">{error}</div>;
    }

    return (
        <>
            {/* Demo Password Info */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">{t("partners_tab.approved.demo_title")}</h3>
                <div className="flex items-center gap-4">
                    <div className="font-mono text-lg bg-white px-3 py-2 rounded border border-blue-300">
                        PartnerPortal@123
                    </div>
                    <p className="text-sm text-blue-700">
                        {t("partners_tab.approved.demo_desc")}
                    </p>
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("partners_tab.common.name")}</TableHead>
                        <TableHead>{t("partners_tab.common.email")}</TableHead>
                        <TableHead>{t("partners_tab.common.number")}</TableHead>
                        <TableHead>{t("partners_tab.common.status")}</TableHead>
                        <TableHead>{t("partners_tab.common.monthly_earnings")}</TableHead>
                        <TableHead>{t("partners_tab.common.actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {partners.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                {t("partners_tab.approved.no_partners")}
                            </TableCell>
                        </TableRow>
                    ) : (
                        partners.map((partner) => (
                            <TableRow key={partner.id}>
                                <TableCell>{partner.name}</TableCell>
                                <TableCell>{partner.email}</TableCell>
                                <TableCell>{partner.number}</TableCell>
                                <TableCell>
                                    <Badge variant="default">{t("partners_tab.approved.active")}</Badge>
                                </TableCell>
                                <TableCell>₹{partner.monthlyEarnings?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link to={`/partners/${partner.id}`}>
                                                <Eye className="h-4 w-4 mr-1" />
                                                {t("reviews.actions.view")}
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleRemovePartner(partner.id)}
                                            disabled={removingPartnerId === partner.id}
                                        >
                                            <UserMinus className="h-4 w-4 mr-1" />
                                            {removingPartnerId === partner.id ? t("partners_tab.approved.removing") : t("partners_tab.approved.remove")}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Details Dialog */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("partners_tab.approved.details_title")}</DialogTitle>
                        <DialogDescription>
                            {t("partners_tab.approved.details_desc", { name: selectedPartner?.name || t("partners_tab.common.unknown") })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPartner && (
                        <div className="space-y-6">
                            {(
                                <>
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="font-semibold text-sm">{t("partners_tab.common.name")}:</label>
                                            <p className="text-sm">{selectedPartner.name}</p>
                                        </div>
                                        <div>
                                            <label className="font-semibold text-sm">{t("partners_tab.common.email")}:</label>
                                            <p className="text-sm">{selectedPartner.email}</p>
                                        </div>
                                        <div>
                                            <label className="font-semibold text-sm">{t("partners_tab.common.number")}:</label>
                                            <p className="text-sm">{selectedPartner.number}</p>
                                        </div>
                                        <div>
                                            <label className="font-semibold text-sm">{t("partners_tab.approved.registered")}:</label>
                                            <p className="text-sm">{formatDate(selectedPartner.registeredAt)}</p>
                                        </div>
                                    </div>

                                    {/* Message */}
                                    {selectedPartner.message && (
                                        <div>
                                            <label className="font-semibold text-sm">{t("partners_tab.approved.message")}:</label>
                                            <p className="text-sm bg-accent p-3 rounded mt-1">
                                                {selectedPartner.message}
                                            </p>
                                        </div>
                                    )}

                                    {/* Coupons */}
                                    <div>
                                        <h4 className="font-semibold mb-2">{t("partners_tab.approved.assigned_coupons")}:</h4>
                                        {selectedPartner.coupons?.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">{t("partners_tab.approved.no_coupons")}</p>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {selectedPartner.coupons?.map(coupon => (
                                                    <div key={coupon.id} className="border rounded px-3 py-2 flex items-center justify-between">
                                                        <div>
                                                            <div className="font-mono text-sm bg-accent px-2 py-1 rounded mb-1 inline-block">
                                                                {coupon.code}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {coupon.description || t("partners_tab.approved.no_desc")}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleRemoveCoupon(selectedPartner.id, coupon.id)}
                                                            disabled={removingCouponId === coupon.id}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {removeCouponError && (
                                            <Alert variant="destructive" className="mt-2">
                                                <AlertDescription>{removeCouponError}</AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

                                    {/* Earnings */}
                                    <div>
                                        <h4 className="font-semibold mb-2">{t("partners_tab.approved.earnings")}:</h4>
                                        <div className="mb-3">
                                            <span className="text-lg font-bold">
                                                {t("partners_tab.approved.total")}: ₹{selectedPartner.earnings?.total?.toFixed(2) || '0.00'}
                                            </span>
                                        </div>
                                        <div>
                                            <h5 className="font-semibold text-sm mb-2">{t("partners_tab.approved.monthly")}:</h5>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                {selectedPartner.earnings?.monthly && Object.entries(selectedPartner.earnings.monthly).map(([month, amount]) => (
                                                    <div key={month} className="bg-accent px-2 py-1 rounded">
                                                        <div className="font-semibold">{month}</div>
                                                        <div>₹{amount.toFixed(2)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">{t("partners_tab.common.close")}</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
