import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { reviews } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Star,
  MoreHorizontal,
  Search,
  Trash,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function ReviewsManagementPage() {
  const { t } = useLanguage();
  // State for reviews data
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Filtering state
  const [filters, setFilters] = useState({
    search: "",
    rating: "all",
    status: "all",
    productId: "",
    sortBy: "createdAt",
    order: "desc" as "asc" | "desc",
  });

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [adminComment, setAdminComment] = useState("");

  // Fetch reviews data
  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Prepare query parameters
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filters.sortBy,
        order: filters.order,
      };

      // Add optional filters if they exist and are not 'all'
      if (filters.search) params.search = filters.search;
      if (filters.rating && filters.rating !== "all")
        params.rating = filters.rating;
      if (filters.status && filters.status !== "all")
        params.status = filters.status;
      if (filters.productId) params.productId = filters.productId;

      const response = await reviews.getReviews(params);

      if (response?.data?.success) {
        setReviewsData(response.data.data.reviews);
        setPagination({
          ...pagination,
          total: response.data.data.total,
          totalPages: response.data.data.totalPages,
        });
      } else {
        setError(response?.data?.message || t("reviews.messages.error_title"));
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      setError(error.message || t("reviews.messages.error_title"));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch review statistics
  const fetchStats = async () => {
    try {
      const response = await reviews.getReviewStats();
      if (response?.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching review stats:", error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [pagination.page, pagination.limit]);

  // Apply filters
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
    fetchReviews();
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      rating: "all",
      status: "all",
      productId: "",
      sortBy: "createdAt",
      order: "desc",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchReviews();
  };

  // Handle review actions
  const handleViewReview = (review: any) => {
    setSelectedReview(review);
    setAdminComment(review.adminComment || "");
    setViewDialogOpen(true);
  };

  const handleReplyToReview = (review: any) => {
    setSelectedReview(review);
    setReplyText(review.adminReply || "");
    setReplyDialogOpen(true);
  };

  const handleDeleteReview = (review: any) => {
    setSelectedReview(review);
    setDeleteDialogOpen(true);
  };

  const submitReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    try {
      const response = await reviews.replyToReview(
        selectedReview.id,
        replyText
      );
      if (response?.data?.success) {
        toast.success(t("reviews.messages.reply_success"));
        setReplyDialogOpen(false);
        fetchReviews(); // Refresh the list
      } else {
        toast.error(response?.data?.message || t("reviews.messages.reply_error"));
      }
    } catch (error: any) {
      console.error("Error adding reply:", error);
      toast.error(error.message || "An error occurred");
    }
  };

  const updateReviewStatus = async (reviewId: string, status: string) => {
    try {
      const response = await reviews.updateReview(reviewId, {
        status: status as any,
      });
      if (response?.data?.success) {
        toast.success(t("reviews.messages.status_success", { status }));
        fetchReviews(); // Refresh the list
        fetchStats(); // Update stats
        setViewDialogOpen(false);
      } else {
        toast.error(
          response?.data?.message || t("reviews.messages.status_error")
        );
      }
    } catch (error: any) {
      console.error("Error updating review status:", error);
      toast.error(error.message || "An error occurred");
    }
  };

  const updateAdminComment = async () => {
    if (!selectedReview) return;

    try {
      const response = await reviews.updateReview(selectedReview.id, {
        adminComment,
      });
      if (response?.data?.success) {
        toast.success(t("reviews.messages.comment_success"));
        setViewDialogOpen(false);
        fetchReviews(); // Refresh the list
      } else {
        toast.error(
          response?.data?.message || t("reviews.messages.comment_error")
        );
      }
    } catch (error: any) {
      console.error("Error updating admin comment:", error);
      toast.error(error.message || "An error occurred");
    }
  };

  const confirmDeleteReview = async () => {
    if (!selectedReview) return;

    try {
      const response = await reviews.deleteReview(selectedReview.id);
      if (response?.data?.success) {
        toast.success(t("reviews.messages.delete_success"));
        setDeleteDialogOpen(false);
        fetchReviews(); // Refresh the list
        fetchStats(); // Update stats
      } else {
        toast.error(response?.data?.message || t("reviews.messages.delete_error"));
      }
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast.error(error.message || t("reviews.messages.error_title"));
    }
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className="h-4 w-4"
            fill={i < rating ? "#FFD700" : "none"}
            stroke={i < rating ? "#FFD700" : "currentColor"}
          />
        ))}
      </div>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs font-medium">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("reviews.status.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2] text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1" />
            {t("reviews.status.rejected")}
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge className="bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7] text-xs font-medium">
            <Clock className="h-3 w-3 mr-1" />
            {t("reviews.status.pending")}
          </Badge>
        );
    }
  };

  // Loading state
  if (isLoading && !reviewsData.length) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            {t("reviews.table.loading")}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !reviewsData.length) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-10">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">{t("reviews.messages.error_title")}</h2>
        <p className="text-center text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchReviews}>
          {t("reviews.messages.try_again")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
            {t("reviews.title")}
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1.5">
            {t("reviews.description")}
          </p>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl border-l-2 border-l-[#3B82F6]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-[#9CA3AF]">
                {t("reviews.stats.total")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#1F2937]">
                {stats.totalReviews || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl border-l-2 border-l-[#4CAF50]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-[#9CA3AF]">
                {t("reviews.stats.average")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-[#1F2937] mr-2">
                  {stats.averageRating ? stats.averageRating.toFixed(1) : "0.0"}
                </span>
                {renderStars(Math.round(stats.averageRating || 0))}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl border-l-2 border-l-[#F59E0B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-[#9CA3AF]">
                {t("reviews.stats.pending")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#1F2937]">
                {stats.pendingReviews || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl border-l-2 border-l-[#2E7D32]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-[#9CA3AF]">
                {t("reviews.stats.recent")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#1F2937]">
                {stats.recentReviews || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1F2937] flex items-center">
            <Filter className="h-5 w-5 mr-2 text-[#4B5563]" />
            {t("reviews.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium text-[#4B5563]">
                {t("reviews.filters.search_label")}
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <Input
                  id="search"
                  name="search"
                  placeholder={t("reviews.filters.search_placeholder")}
                  className="pl-10 border-[#E5E7EB] focus:border-primary"
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rating" className="text-sm font-medium text-[#4B5563]">
                {t("reviews.filters.rating_label")}
              </Label>
              <Select
                value={filters.rating}
                onValueChange={(value) => handleSelectChange("rating", value)}
              >
                <SelectTrigger id="rating" className="mt-1 border-[#E5E7EB] focus:border-primary">
                  <SelectValue placeholder={t("reviews.filters.all_ratings")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reviews.filters.all_ratings")}</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-[#4B5563]">
                {t("reviews.filters.status_label")}
              </Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger id="status" className="mt-1 border-[#E5E7EB] focus:border-primary">
                  <SelectValue placeholder={t("reviews.filters.all_statuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reviews.filters.all_statuses")}</SelectItem>
                  <SelectItem value="APPROVED">{t("reviews.status.approved")}</SelectItem>
                  <SelectItem value="PENDING">{t("reviews.status.pending")}</SelectItem>
                  <SelectItem value="REJECTED">{t("reviews.status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sortBy" className="text-sm font-medium text-[#4B5563]">
                {t("reviews.filters.sort_by")}
              </Label>
              <div className="flex gap-2 mt-1">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => handleSelectChange("sortBy", value)}
                >
                  <SelectTrigger id="sortBy" className="border-[#E5E7EB] focus:border-primary">
                    <SelectValue placeholder={t("reviews.filters.sort_by")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">{t("reviews.filters.date")}</SelectItem>
                    <SelectItem value="rating">{t("reviews.filters.rating_label")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.order}
                  onValueChange={(value) =>
                    handleSelectChange("order", value as "asc" | "desc")
                  }
                >
                  <SelectTrigger id="order" className="border-[#E5E7EB] focus:border-primary">
                    <SelectValue placeholder={t("reviews.filters.order")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">{t("reviews.filters.descending")}</SelectItem>
                    <SelectItem value="asc">{t("reviews.filters.ascending")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={resetFilters}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t("reviews.filters.reset")}
            </Button>
            <Button
              className=""
              onClick={applyFilters}
            >
              {t("reviews.filters.apply")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1F2937]">
            {t("reviews.table.title")}
          </CardTitle>
          <CardDescription className="text-sm text-[#9CA3AF]">
            {pagination.total} {t("reviews.table.total_found")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center py-20">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50]" />
                <p className="mt-4 text-base text-[#9CA3AF]">{t("reviews.table.loading")}</p>
              </div>
            </div>
          )}

          {!isLoading && reviewsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                <MessageSquare className="h-8 w-8 text-[#9CA3AF]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
                {t("reviews.table.no_reviews")}
              </h3>
              <p className="text-sm text-[#9CA3AF]">
                {t("reviews.table.empty_hint")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {reviewsData.map((review) => (
                <div
                  key={review.id}
                  className="p-6 hover:bg-[#F3F7F6] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FEF3C7] flex-shrink-0">
                        <Star className="h-6 w-6 text-[#F59E0B]" fill="#F59E0B" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-[#1F2937] truncate">
                            {review.product?.name || t("reviews.table.unknown_product")}
                          </h3>
                          {renderStars(review.rating)}
                        </div>
                        <p className="font-medium text-[#1F2937] mb-1 truncate">
                          {review.title}
                        </p>
                        <p className="text-sm text-[#9CA3AF] line-clamp-2 mb-2">
                          {review.comment}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-[#9CA3AF]">
                          <span>{review.user?.name || t("reviews.table.anonymous")}</span>
                          <span>•</span>
                          <span>{formatDate(review.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getStatusBadge(review.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 hover:bg-[#F3F4F6]"
                          >
                            <MoreHorizontal className="h-4 w-4 text-[#4B5563]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#FFFFFF] border-[#E5E7EB] shadow-lg"
                        >
                          <DropdownMenuItem
                            className="text-[#1F2937] hover:bg-[#F3F7F6]"
                            onClick={() => handleViewReview(review)}
                          >
                            {t("reviews.actions.view")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-[#1F2937] hover:bg-[#F3F7F6]"
                            onClick={() => handleReplyToReview(review)}
                          >
                            {t("reviews.actions.reply")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-[#1F2937] hover:bg-[#F3F7F6]"
                            onClick={() =>
                              updateReviewStatus(review.id, "APPROVED")
                            }
                            disabled={review.status === "APPROVED"}
                          >
                            {t("reviews.actions.approve")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-[#1F2937] hover:bg-[#F3F7F6]"
                            onClick={() =>
                              updateReviewStatus(review.id, "REJECTED")
                            }
                            disabled={review.status === "REJECTED"}
                          >
                            {t("reviews.actions.reject")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-[#EF4444] hover:bg-[#FEF2F2]"
                            onClick={() => handleDeleteReview(review)}
                          >
                            {t("reviews.actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <DataTablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(page) => {
                  setPagination((prev) => ({ ...prev, page }));
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* View/Edit Review Dialog */}
      {selectedReview && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("reviews.dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("reviews.dialog.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">
                    {selectedReview.product?.name}
                  </h3>
                  <div className="flex items-center mt-1">
                    {renderStars(selectedReview.rating)}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {selectedReview.rating}/5
                    </span>
                  </div>
                </div>
                {getStatusBadge(selectedReview.status)}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">{t("reviews.dialog.review_title")}</h4>
                <p>{selectedReview.title}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">{t("reviews.dialog.review_content")}</h4>
                <p className="whitespace-pre-line">{selectedReview.comment}</p>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {t("reviews.dialog.by")}: {selectedReview.user?.name || t("reviews.table.anonymous")} (
                  {selectedReview.user?.email || "No email"})
                </span>
                <span>{t("reviews.dialog.posted")}: {formatDate(selectedReview.createdAt)}</span>
              </div>

              {selectedReview.adminReply && (
                <div className="bg-muted p-3 rounded-md mt-4">
                  <h4 className="text-sm font-medium mb-1">{t("reviews.dialog.admin_reply")}</h4>
                  <p className="text-sm">{selectedReview.adminReply}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("reviews.dialog.replied_on")}: {formatDate(selectedReview.adminReplyDate)}
                  </p>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <Label htmlFor="adminComment">
                  {t("reviews.dialog.admin_comment")}
                </Label>
                <Textarea
                  id="adminComment"
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder={t("reviews.dialog.admin_comment_placeholder")}
                  className="mt-1"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Review Status</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={
                      selectedReview.status === "APPROVED"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      updateReviewStatus(selectedReview.id, "APPROVED")
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {t("reviews.actions.approve")}
                  </Button>
                  <Button
                    variant={
                      selectedReview.status === "PENDING"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      updateReviewStatus(selectedReview.id, "PENDING")
                    }
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    {t("reviews.actions.mark_pending")}
                  </Button>
                  <Button
                    variant={
                      selectedReview.status === "REJECTED"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      updateReviewStatus(selectedReview.id, "REJECTED")
                    }
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {t("reviews.actions.reject")}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setViewDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={updateAdminComment}>Save Comment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reply to Review Dialog */}
      {selectedReview && (
        <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Reply to Review</DialogTitle>
              <DialogDescription>
                Your reply will be visible to the customer and other shoppers
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-center mb-2">
                  {renderStars(selectedReview.rating)}
                  <span className="ml-2 font-medium">
                    {selectedReview.title}
                  </span>
                </div>
                <p className="text-sm">{selectedReview.comment}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  By {selectedReview.user?.name || "Anonymous"} on{" "}
                  {formatDate(selectedReview.createdAt)}
                </p>
              </div>

              <div>
                <Label htmlFor="replyText">Your Reply</Label>
                <Textarea
                  id="replyText"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply to the customer here..."
                  className="mt-1"
                  rows={5}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReplyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={submitReply} disabled={!replyText.trim()}>
                Post Reply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Review Dialog */}
      {selectedReview && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Delete Review</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The review will be permanently
                deleted.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p>
                Are you sure you want to delete this review from{" "}
                <span className="font-medium">
                  {selectedReview.user?.name || "Anonymous"}
                </span>
                ?
              </p>
              <div className="bg-muted p-3 rounded-md mt-3">
                <div className="flex items-center">
                  {renderStars(selectedReview.rating)}
                  <span className="ml-2 text-sm">{selectedReview.title}</span>
                </div>
                <p className="text-sm mt-1 line-clamp-2">
                  {selectedReview.comment}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteReview}>
                <Trash className="h-4 w-4 mr-1" />
                Delete Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
