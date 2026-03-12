import { useEffect, useState } from "react";
import { useRef } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";


const API_URL = import.meta.env.VITE_API_URL;

type PartnerRequest = {
    id: string;
    name: string;
    email: string;
    number: string;
    city: string;
    state: string;
    message: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    partner?: {
        id: string;
        name: string;
        email: string;
        number: string;
        city: string;
        state: string;
    };
};

const statusVariants: Record<PartnerRequest["status"], "secondary" | "destructive" | "default"> = {
    PENDING: "secondary",
    APPROVED: "default",
    REJECTED: "destructive",
};

// Types for partner details API
type PartnerDetails = {
    partner: {
        id: string;
        name: string;
        email: string;
        number: string;
        city: string;
        state: string;
        password: string;
    };
    coupons: Array<{
        id: string;
        code: string;
        description?: string;
        discountType: string;
        discountValue: string;
    }>;
    earnings: {
        total: number;
        monthly: Record<string, number>;
    };
};

export default function PartnerRegistrationsPage() {
    const { t } = useLanguage();
    // Show password dialog state
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [approvedPassword, setApprovedPassword] = useState("");
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);
    const [requests, setRequests] = useState<PartnerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Partner details dialog state
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [detailsPartnerId, setDetailsPartnerId] = useState<string | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");
    const [partnerDetails, setPartnerDetails] = useState<PartnerDetails | null>(null);

    const [removingCouponId, setRemovingCouponId] = useState<string | null>(null);
    const [removeCouponError, setRemoveCouponError] = useState("");

    // Open details dialog and fetch partner details
    const openDetailsDialog = async (partnerId: string) => {
        setDetailsPartnerId(partnerId);
        setDetailsDialogOpen(true);
        setDetailsLoading(true);
        setDetailsError("");
        setPartnerDetails(null);

        try {
            const res = await axios.get(`${API_URL}/api/admin/partners/${partnerId}/details`);
            setPartnerDetails(res.data.data);
        } catch {
            setDetailsError(t('partner_management.details.toasts.fetch_error') || "Failed to fetch partner details.");
        } finally {
            setDetailsLoading(false);
        }
    };

    // Remove coupon from partner
    const handleRemoveCoupon = async (partnerId: string, couponId: string) => {
        if (!window.confirm("Remove this coupon from partner?")) return;
        setRemovingCouponId(couponId);
        setRemoveCouponError("");
        try {
            await axios.delete(`${API_URL}/api/admin/partners/${partnerId}/coupons/${couponId}`);
            setPartnerDetails((prev) => prev ? { ...prev, coupons: prev.coupons.filter(c => c.id !== couponId) } : prev);
        } catch {
            setRemoveCouponError("Failed to remove coupon.");
        } finally {
            setRemovingCouponId(null);
        }
    };

    // Dialog state for approve
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [approveId, setApproveId] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [approveLoading, setApproveLoading] = useState(false);
    const [approveApiError, setApproveApiError] = useState("");

    // Filter state
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [dateFilter, setDateFilter] = useState<string>("");

    const openApproveDialog = (id: string) => {
        setApproveId(id);
        setPassword("");
        setPasswordError("");
        setApproveApiError("");
        setApproveDialogOpen(true);
    };

    const closeApproveDialog = () => {
        setApproveDialogOpen(false);
        setApproveId(null);
        setPassword("");
        setPasswordError("");
        setApproveApiError("");
    };

    const handleApprove = async () => {
        if (!password || password.length < 6) {
            setPasswordError(t('partner_management.registrations.dialogs.approve.password_error') || "Password must be at least 6 characters.");
            return;
        }
        setApproveLoading(true);
        setPasswordError("");
        setApproveApiError("");
        try {
            await axios.post(`${API_URL}/api/admin/partners/requests/${approveId}/approve`, { password });
            setRequests((prev) => prev.map((r) => r.id === approveId ? { ...r, status: "APPROVED" } : r));
            setApprovedPassword(password);
            setShowPasswordDialog(true);
            closeApproveDialog();
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setApproveApiError(err.response?.data?.message || t('partner_management.registrations.dialogs.approve.error') || "Failed to approve partner.");
            } else {
                setApproveApiError(t('partner_management.registrations.dialogs.approve.error') || "Failed to approve partner.");
            }
        } finally {
            setApproveLoading(false);
        }
    };

    const handleReject = async (id: string) => {
        if (!window.confirm(t('partner_management.registrations.confirm_reject') || "Are you sure you want to reject this request?")) return;
        try {
            await axios.post(`${API_URL}/api/admin/partners/requests/${id}/reject`);
            setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "REJECTED" } : r));
        } catch {
            alert("Failed to reject partner.");
        }
    };

    useEffect(() => {
        async function fetchRequests() {
            try {
                const res = await axios.get(`${API_URL}/api/admin/partners/requests`);
                setRequests(res.data.data.requests || []);
            } catch {
                setError(t('partner_management.registrations.fetch_error') || "Failed to fetch partner registrations");
            }
            setLoading(false);
        }
        fetchRequests();
    }, [t]);

    const statusCount = requests.reduce(
        (acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
        },
        { PENDING: 0, APPROVED: 0, REJECTED: 0 } as Record<PartnerRequest["status"], number>
    );

    // Filtered requests
    const filteredRequests = requests.filter((r) => {
        const statusMatch = statusFilter === "ALL" || r.status === statusFilter;
        let dateMatch = true;
        if (dateFilter) {
            // Compare only date part (yyyy-mm-dd)
            const reqDate = new Date(r.createdAt).toISOString().slice(0, 10);
            dateMatch = reqDate === dateFilter;
        }
        return statusMatch && dateMatch;
    });

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Show password dialog after approval */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('partner_management.registrations.dialogs.password.title')}</DialogTitle>
                        <DialogDescription>
                            {t('partner_management.registrations.dialogs.password.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2 mt-2">
                        <Input ref={passwordInputRef} value={approvedPassword} readOnly className="w-48" />
                        <Button
                            type="button"
                            onClick={async () => {
                                if (approvedPassword) {
                                    await navigator.clipboard.writeText(approvedPassword);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }
                            }}
                        >
                            {copied ? t('partner_management.registrations.dialogs.password.copied') : t('partner_management.registrations.dialogs.password.copy')}
                        </Button>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" type="button">{t('partner_management.registrations.actions.close')}</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Card>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 pt-2">
                    <h1 className="text-2xl font-bold">{t('partner_management.registrations.title')}</h1>
                    <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{t('partner_management.registrations.badges.pending')}: <span className="font-semibold">{statusCount.PENDING}</span></Badge>
                        <Badge variant="default">{t('partner_management.registrations.badges.approved')}: <span className="font-semibold">{statusCount.APPROVED}</span></Badge>
                        <Badge variant="destructive">{t('partner_management.registrations.badges.rejected')}: <span className="font-semibold">{statusCount.REJECTED}</span></Badge>
                    </div>
                </div>
                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-center px-6 pt-4 pb-2">
                    <div className="w-full md:w-48">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('partner_management.registrations.filters.placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t('partner_management.registrations.filters.all_statuses')}</SelectItem>
                                <SelectItem value="PENDING">{t('partner_management.registrations.badges.pending')}</SelectItem>
                                <SelectItem value="APPROVED">{t('partner_management.registrations.badges.approved')}</SelectItem>
                                <SelectItem value="REJECTED">{t('partner_management.registrations.badges.rejected')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full md:w-48">
                        <Input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            max={new Date().toISOString().slice(0, 10)}
                        />
                    </div>
                    <Button variant="outline" onClick={() => { setStatusFilter("ALL"); setDateFilter(""); }}>
                        {t('partner_management.registrations.filters.clear_filters')}
                    </Button>
                </div>
                <div className="p-2 md:p-6">
                    {loading ? (
                        <div className="text-center py-10 text-muted-foreground">{t('contact_management.loading')}</div>
                    ) : error ? (
                        <div className="text-red-600 text-center py-10">{error}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('partner_management.registrations.table.name')}</TableHead>
                                    <TableHead>{t('partner_management.registrations.table.email')}</TableHead>
                                    <TableHead>{t('partner_management.registrations.table.number')}</TableHead>
                                    <TableHead>{t('partner_management.registrations.table.city')}</TableHead>
                                    <TableHead>{t('partner_management.registrations.table.state')}</TableHead>
                                    <TableHead>{t('partner_management.registrations.table.status')}</TableHead>
                                    <TableHead>{t('partner_management.registrations.table.message')}</TableHead>
                                    <TableHead>{t('partner_management.registrations.table.requested_at')}</TableHead>
                                    <TableHead>{t('partner_management.registrations.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRequests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('partner_management.registrations.table.empty')}</TableCell>
                                    </TableRow>
                                ) : filteredRequests.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.name}</TableCell>
                                        <TableCell>{r.email}</TableCell>
                                        <TableCell>{r.number}</TableCell>
                                        <TableCell>{r.city}</TableCell>
                                        <TableCell>{r.state}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariants[r.status]}>{r.status}</Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate" title={r.message}>{r.message}</TableCell>
                                        <TableCell>{formatDate(r.createdAt)}</TableCell>
                                        <TableCell>
                                            {r.status === "PENDING" ? (
                                                <div className="flex gap-2">
                                                    <Dialog open={approveDialogOpen && approveId === r.id} onOpenChange={(open) => { if (!open) closeApproveDialog(); }}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="default" onClick={() => openApproveDialog(r.id)}>
                                                                {t('partner_management.registrations.actions.approve')}
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>{t('partner_management.registrations.dialogs.approve.title')}</DialogTitle>
                                                                <DialogDescription>
                                                                    {t('partner_management.registrations.dialogs.approve.description')}
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            {approveApiError && (
                                                                <Alert variant="destructive" className="mb-2">
                                                                    <AlertTitle>Error</AlertTitle>
                                                                    <AlertDescription>{approveApiError}</AlertDescription>
                                                                </Alert>
                                                            )}
                                                            <Input
                                                                type="password"
                                                                placeholder={t('partner_management.registrations.dialogs.approve.password_placeholder')}
                                                                value={password}
                                                                onChange={e => setPassword(e.target.value)}
                                                                disabled={approveLoading}
                                                                autoFocus
                                                                aria-invalid={!!passwordError}
                                                            />
                                                            {passwordError && (
                                                                <div className="text-destructive text-sm mt-1">{passwordError}</div>
                                                            )}
                                                            <DialogFooter>
                                                                <Button onClick={handleApprove} disabled={approveLoading}>
                                                                    {approveLoading ? "Approving..." : t('partner_management.registrations.dialogs.approve.submit')}
                                                                </Button>
                                                                <DialogClose asChild>
                                                                    <Button variant="outline" type="button" disabled={approveLoading}>{t('partner_management.registrations.actions.cancel')}</Button>
                                                                </DialogClose>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button size="sm" variant="destructive" onClick={() => handleReject(r.id)}>
                                                        {t('partner_management.registrations.actions.reject')}
                                                    </Button>
                                                </div>
                                            ) : r.status === "APPROVED" ? (
                                                <Dialog open={detailsDialogOpen && detailsPartnerId === r.partner?.id} onOpenChange={(open) => { setDetailsDialogOpen(open); if (!open) setPartnerDetails(null); }}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline" onClick={() => { if (r.partner?.id) openDetailsDialog(r.partner.id); }} disabled={!r.partner?.id}>
                                                            {t('partner_management.registrations.actions.details')}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-lg">
                                                        <DialogHeader>
                                                            <DialogTitle>{t('partner_management.registrations.dialogs.details.title')}</DialogTitle>
                                                            <DialogDescription>{t('partner_management.registrations.dialogs.details.description')}</DialogDescription>
                                                        </DialogHeader>
                                                        {detailsLoading ? (
                                                            <div className="py-8 text-center text-muted-foreground">{t('contact_management.loading')}</div>
                                                        ) : detailsError ? (
                                                            <Alert variant="destructive" className="mb-2">
                                                                <AlertTitle>Error</AlertTitle>
                                                                <AlertDescription>{detailsError}</AlertDescription>
                                                            </Alert>
                                                        ) : partnerDetails && (
                                                            <div className="space-y-4">

                                                                <div>
                                                                    <div className="font-semibold mb-1 ">{t('partner_management.registrations.dialogs.details.assigned_coupons')}:</div>
                                                                    {partnerDetails.coupons.length === 0 ? (
                                                                        <div className="text-muted-foreground text-sm">{t('partner_management.details.coupons.empty')}</div>
                                                                    ) : (
                                                                        <ul className="space-y-2 grid grid-cols-2 gap-2">
                                                                            {partnerDetails.coupons.map(coupon => (
                                                                                <li key={coupon.id} className="flex items-center gap-2 border rounded px-2 py-1 ">
                                                                                    <span className="font-mono text-xs bg-accent px-2 py-0.5 rounded">{coupon.code}</span>
                                                                                    <span className="text-xs text-muted-foreground">{coupon.description}</span>
                                                                                    <Button size="icon" variant="ghost" title="Remove coupon" onClick={() => handleRemoveCoupon(partnerDetails.partner.id, coupon.id)} disabled={removingCouponId === coupon.id}>
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </Button>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                    {removeCouponError && <div className="text-destructive text-xs mt-1">{removeCouponError}</div>}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold mb-1">{t('partner_management.registrations.dialogs.details.earnings')}:</div>
                                                                    <div>{t('partner_management.registrations.dialogs.details.total')}: <span className="font-bold">₹{partnerDetails.earnings.total.toFixed(2)}</span></div>
                                                                    <div className="mt-1">
                                                                        <div className="font-semibold text-xs mb-1">{t('partner_management.registrations.dialogs.details.monthly')}:</div>
                                                                        <ul className="text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                                                                            {Object.entries(partnerDetails.earnings.monthly).map(([month, amt]) => (
                                                                                <li key={month}>{month}: <span className="font-mono">₹{amt.toFixed(2)}</span></li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button variant="outline" type="button">{t('partner_management.registrations.actions.close')}</Button>
                                                            </DialogClose>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    );
}
