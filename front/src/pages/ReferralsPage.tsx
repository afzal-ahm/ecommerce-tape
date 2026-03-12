import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Users,
  TrendingUp,
  IndianRupee,
  CheckCircle,
  Clock,
  XCircle,
  Search
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";

interface Referral {
  id: string;
  code: string;
  referrer: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
  };
  referred: {
    id: string;
    name: string;
    email: string;
  };
  rewardAmount: number | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  order: {
    id: string;
    orderNumber: string;
    total: number;
    createdAt: string;
  } | null;
  completedAt: string | null;
  createdAt: string;
}

interface ReferralStats {
  totalReferrals: number;
  statusBreakdown: {
    PENDING?: number;
    COMPLETED?: number;
    CANCELLED?: number;
  };
  totalRewardsPaid: number;
  completedReferrals: number;
  topReferrers: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      referralCode: string;
    } | null;
    totalReferrals: number;
    totalEarnings: number;
  }>;
}

export default function ReferralsPage() {
  const { t } = useLanguage();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReferrals();
    fetchStats();
  }, [page, statusFilter]);

  const fetchReferrals = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get("/api/admin/referrals", { params });
      if (response.data.success) {
        setReferrals(response.data.data.referrals || []);
        setTotalPages(response.data.data.pagination?.pages || 1);
      }
    } catch (error: any) {
      console.error("Error fetching referrals:", error);
      toast.error(error.response?.data?.message || t('referrals_page.list.no_referrals'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setIsStatsLoading(true);
      const response = await api.get("/api/admin/referrals/stats");
      if (response.data.success) {
        setStats(response.data.data.stats);
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchReferrals();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs font-medium">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('referrals_page.badges.completed')}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7] text-xs font-medium">
            <Clock className="h-3 w-3 mr-1" />
            {t('referrals_page.badges.pending')}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2] text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1" />
            {t('referrals_page.badges.cancelled')}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB] text-xs font-medium">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
            {t('referrals_page.title')}
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1.5">
            {t('referrals_page.description')}
          </p>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Statistics Cards */}
      {!isStatsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl border-l-2 border-l-[#3B82F6]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#9CA3AF] mb-1">
                    {t('referrals_page.stats.total_referrals')}
                  </p>
                  <p className="text-2xl font-bold text-[#1F2937]">
                    {stats.totalReferrals}
                  </p>
                </div>
                <Users className="h-8 w-8 text-[#3B82F6]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl border-l-2 border-l-[#22C55E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#9CA3AF] mb-1">
                    {t('referrals_page.stats.completed')}
                  </p>
                  <p className="text-2xl font-bold text-[#1F2937]">
                    {stats.completedReferrals}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-[#22C55E]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl border-l-2 border-l-[#F59E0B]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#9CA3AF] mb-1">
                    {t('referrals_page.stats.pending')}
                  </p>
                  <p className="text-2xl font-bold text-[#1F2937]">
                    {stats.statusBreakdown.PENDING || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-[#F59E0B]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl border-l-2 border-l-[#4CAF50]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#9CA3AF] mb-1">
                    {t('referrals_page.stats.total_rewards_paid')}
                  </p>
                  <p className="text-2xl font-bold text-[#1F2937] flex items-center gap-1">
                    <IndianRupee className="h-5 w-5" />
                    {stats.totalRewardsPaid.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#4CAF50]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Referrers */}
      {!isStatsLoading && stats && stats.topReferrers.length > 0 && (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#1F2937]">
              {t('referrals_page.top_referrers.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topReferrers.slice(0, 5).map((ref, index) => (
                <div
                  key={ref.user?.id || index}
                  className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F7F6] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#E8F5E9] text-[#2E7D32] font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1F2937]">
                        {ref.user?.name || ref.user?.email || t('referrals_page.top_referrers.unknown_user')}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        {t('referrals_page.top_referrers.code')}: {ref.user?.referralCode || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#1F2937]">
                      {ref.totalReferrals} {t('referrals_page.top_referrers.referrals_suffix')}
                    </p>
                    <p className="text-sm text-[#22C55E] flex items-center gap-1 justify-end">
                      <IndianRupee className="h-3 w-3" />
                      {ref.totalEarnings.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1F2937]">
            {t('referrals_page.list.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder={t('referrals_page.search.placeholder')}
                className="border-[#E5E7EB] focus:border-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <select
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-primary focus:outline-none"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('referrals_page.filters.all_status')}</option>
              <option value="PENDING">{t('referrals_page.filters.pending')}</option>
              <option value="COMPLETED">{t('referrals_page.filters.completed')}</option>
              <option value="CANCELLED">{t('referrals_page.filters.cancelled')}</option>
            </select>
            <Button
              onClick={handleSearch}
              className=""
            >
              <Search className="h-4 w-4 mr-2" />
              {t('referrals_page.search.button')}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
                <p className="mt-4 text-base text-[#9CA3AF]">{t('contact_management.loading')}</p>
              </div>
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                <Users className="h-8 w-8 text-[#9CA3AF]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
                {t('referrals_page.list.no_referrals')}
              </h3>
              <p className="text-sm text-[#9CA3AF]">
                {t('referrals_page.list.empty_description')}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <Card
                    key={referral.id}
                    className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">{t('referrals_page.card.referral_code')}</p>
                              <p className="font-mono font-semibold">{referral.code}</p>
                            </div>
                            {getStatusBadge(referral.status)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                {t('referrals_page.card.referrer_label')}
                              </p>
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="font-medium">{referral.referrer.name || "N/A"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {referral.referrer.email}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('referrals_page.top_referrers.code')}: {referral.referrer.referralCode || "N/A"}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                {t('referrals_page.card.referred_label')}
                              </p>
                              <div className="p-3 bg-green-50 rounded-lg">
                                <p className="font-medium">{referral.referred.name || "N/A"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {referral.referred.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          {referral.order && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                {t('referrals_page.card.order_details')}
                              </p>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{referral.order.orderNumber}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(referral.order.createdAt)}
                                  </p>
                                </div>
                                <p className="font-semibold flex items-center gap-1">
                                  <IndianRupee className="h-4 w-4" />
                                  {referral.order.total.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          )}

                          {referral.rewardAmount && (
                            <div className="flex items-center gap-2 text-green-600">
                              <IndianRupee className="h-4 w-4" />
                              <span className="font-semibold">
                                {t('referrals_page.card.reward')}: ₹{referral.rewardAmount.toFixed(2)}
                              </span>
                              {referral.completedAt && (
                                <span className="text-sm text-muted-foreground">
                                  ({t('referrals_page.card.completed_on')} {formatDate(referral.completedAt)})
                                </span>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            {t('referrals_page.card.created')}: {formatDate(referral.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}






