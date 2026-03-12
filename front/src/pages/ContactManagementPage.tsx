import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MoreHorizontal,
  Eye,
  Trash2,
  MessageSquare,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { API_URL } from "@/config/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useLanguage } from "@/context/LanguageContext";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED" | "SPAM";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContactSubmissionsResponse {
  submissions: ContactSubmission[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalSubmissions: number;
  };
}

const updateStatusSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "SPAM"]),
  notes: z.string().optional(),
});

const ContactManagementPage = () => {
  const { t } = useLanguage();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<ContactSubmission | null>(null);

  const { toast } = useToast();

  const statusLabels: Record<string, string> = {
    NEW: t("contact_management.status.new"),
    IN_PROGRESS: t("contact_management.status.in_progress"),
    RESOLVED: t("contact_management.status.resolved"),
    SPAM: t("contact_management.status.spam"),
  };

  const updateForm = useForm<z.infer<typeof updateStatusSchema>>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      status: "NEW",
      notes: "",
    },
  });

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      let url = `${API_URL}/admin/contact?page=${page}&limit=10`;
      if (selectedStatus) {
        url += `&status=${selectedStatus}`;
      }

      const response = await axios.get<{ data: ContactSubmissionsResponse }>(
        url
      );

      // Add defensive checks for the response structure
      const responseData = response.data?.data;
      setSubmissions(responseData?.submissions || []);
      setTotalPages(responseData?.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching contact submissions:", error);
      setSubmissions([]); // Set empty array on error
      toast({
        title: "Error",
        description: t("contact_management.messages.fetch_error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [page, selectedStatus]);

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value === "ALL" ? null : value);
    setPage(1);
  };

  const handleViewSubmission = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setViewDialogOpen(true);
  };

  const handleUpdateStatus = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    updateForm.setValue("status", submission.status);
    updateForm.setValue("notes", submission.notes || "");
    setUpdateDialogOpen(true);
  };

  const confirmDelete = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSubmission = async () => {
    if (!selectedSubmission) return;

    try {
      await axios.delete(`${API_URL}/admin/contact/${selectedSubmission.id}`);

      toast({
        title: "Success",
        description: t("contact_management.messages.delete_success"),
      });

      fetchSubmissions();
    } catch (error) {
      console.error("Error deleting contact submission:", error);
      toast({
        title: "Error",
        description: t("contact_management.messages.delete_error"),
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedSubmission(null);
    }
  };

  const handleUpdateSubmission = async (
    values: z.infer<typeof updateStatusSchema>
  ) => {
    if (!selectedSubmission) return;

    try {
      await axios.put(
        `${API_URL}/admin/contact/${selectedSubmission.id}/status`,
        {
          status: values.status,
          notes: values.notes,
        }
      );

      toast({
        title: "Success",
        description: t("contact_management.messages.update_success"),
      });

      fetchSubmissions();
      setUpdateDialogOpen(false);
      setSelectedSubmission(null);
    } catch (error) {
      console.error("Error updating contact submission:", error);
      toast({
        title: "Error",
        description: t("contact_management.messages.update_error"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
            {t("contact_management.title")}
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1.5">
            {t("contact_management.description")}
          </p>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Filters Bar */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                type="search"
                placeholder={t("contact_management.search_placeholder")}
                className="pl-10 border-[#E5E7EB] focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={selectedStatus || "ALL"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full md:w-[180px] border-[#E5E7EB] focus:border-primary">
                <SelectValue placeholder={t("contact_management.filter_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("contact_management.all_status")}</SelectItem>
                <SelectItem value="NEW">{t("contact_management.status.new")}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t("contact_management.status.in_progress")}</SelectItem>
                <SelectItem value="RESOLVED">{t("contact_management.status.resolved")}</SelectItem>
                <SelectItem value="SPAM">{t("contact_management.status.spam")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#4CAF50] border-t-transparent"></div>
                <p className="mt-4 text-base text-[#9CA3AF]">{t("contact_management.loading")}</p>
              </div>
            </div>
          ) : !submissions || submissions.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                  <MessageSquare className="h-8 w-8 text-[#9CA3AF]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">
                  {t("contact_management.no_submissions")}
                </h3>
                <p className="text-sm text-[#9CA3AF]">
                  {t("contact_management.no_submissions_desc")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#E5E7EB]">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="p-6 hover:bg-[#F3F7F6] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] flex-shrink-0">
                          <MessageSquare className="h-6 w-6 text-[#3B82F6]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#1F2937] truncate">
                            {submission.name}
                          </h3>
                          <p className="text-sm text-[#9CA3AF] truncate">
                            {submission.email}
                          </p>
                          {submission.subject && (
                            <p className="text-xs text-[#9CA3AF] truncate mt-1">
                              {submission.subject}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-[#9CA3AF]">
                            {formatDistanceToNow(new Date(submission.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <Badge
                          className={
                            submission.status === "NEW"
                              ? "bg-[#EFF6FF] text-[#3B82F6] border-[#DBEAFE] text-xs font-medium"
                              : submission.status === "IN_PROGRESS"
                                ? "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7] text-xs font-medium"
                                : submission.status === "RESOLVED"
                                  ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs font-medium"
                                  : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB] text-xs font-medium"
                          }
                        >
                          {statusLabels[submission.status]}
                        </Badge>
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
                              onClick={() => handleViewSubmission(submission)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> {t("contact_management.actions.view_details")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[#1F2937] hover:bg-[#F3F7F6]"
                              onClick={() => handleUpdateStatus(submission)}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />{" "}
                              {t("contact_management.actions.update_status")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[#EF4444] hover:bg-[#FEF2F2]"
                              onClick={() => confirmDelete(submission)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> {t("contact_management.actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-[#E5E7EB] px-6 py-4">
                <div className="text-sm text-[#9CA3AF]">
                  {t("contact_management.page")} {page} {t("contact_management.of")} {totalPages}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        className={
                          page <= 1
                            ? "pointer-events-none opacity-50"
                            : "hover:bg-[#F3F7F6]"
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={pageNum === page}
                            className={
                              pageNum === page
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "hover:bg-[#F3F7F6]"
                            }
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setPage((prev) =>
                            prev < totalPages ? prev + 1 : prev
                          )
                        }
                        className={
                          page >= totalPages
                            ? "pointer-events-none opacity-50"
                            : "hover:bg-[#F3F7F6]"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Contact Submission Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {t("contact_management.view_dialog.title")}
            </DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t("contact_management.view_dialog.name")}</p>
                  <p className="font-medium text-[#1F2937]">
                    {selectedSubmission.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t("contact_management.view_dialog.email")}</p>
                  <p className="font-medium text-[#1F2937] break-all">
                    {selectedSubmission.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t("contact_management.view_dialog.phone")}</p>
                  <p className="font-medium text-[#1F2937]">
                    {selectedSubmission.phone || t("contact_management.view_dialog.not_provided")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t("contact_management.view_dialog.subject")}</p>
                  <p className="font-medium text-[#1F2937]">
                    {selectedSubmission.subject || t("contact_management.view_dialog.no_subject")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#9CA3AF] mb-1">{t("contact_management.status_label")}</p>
                <Badge
                  className={
                    selectedSubmission.status === "NEW"
                      ? "bg-[#EFF6FF] text-[#3B82F6] border-[#DBEAFE] text-xs font-medium"
                      : selectedSubmission.status === "IN_PROGRESS"
                        ? "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7] text-xs font-medium"
                        : selectedSubmission.status === "RESOLVED"
                          ? "bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs font-medium"
                          : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB] text-xs font-medium"
                  }
                >
                  {statusLabels[selectedSubmission.status]}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-[#9CA3AF] mb-2">{t("contact_management.view_dialog.message")}</p>
                <div className="p-4 bg-[#F3F7F6] rounded-lg border border-[#E5E7EB] whitespace-pre-wrap text-sm text-[#4B5563]">
                  {selectedSubmission.message}
                </div>
              </div>

              {selectedSubmission.notes && (
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-2">{t("contact_management.view_dialog.admin_notes")}</p>
                  <div className="p-4 bg-[#FFFBEB] rounded-lg border border-[#FEF3C7] whitespace-pre-wrap text-sm text-[#4B5563]">
                    {selectedSubmission.notes}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t("contact_management.view_dialog.submitted")}</p>
                  <p className="font-medium text-[#1F2937] text-sm">
                    {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">{t("contact_management.view_dialog.last_updated")}</p>
                  <p className="font-medium text-[#1F2937] text-sm">
                    {new Date(selectedSubmission.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button
                  variant="outline"
                  className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setSelectedSubmission(null);
                  }}
                >
                  {t("contact_management.view_dialog.close")}
                </Button>
                <Button
                  className=""
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleUpdateStatus(selectedSubmission);
                  }}
                >
                  {t("contact_management.view_dialog.update")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {t("contact_management.update_dialog.title")}
            </DialogTitle>
          </DialogHeader>
          <Form {...updateForm}>
            <form
              onSubmit={updateForm.handleSubmit(handleUpdateSubmission)}
              className="space-y-5 py-4"
            >
              <FormField
                control={updateForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-[#4B5563]">
                      {t("contact_management.update_dialog.status_label")}
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="border-[#E5E7EB] focus:border-primary">
                          <SelectValue placeholder={t("contact_management.update_dialog.select_status")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">{t("contact_management.status.new")}</SelectItem>
                          <SelectItem value="IN_PROGRESS">
                            {t("contact_management.status.in_progress")}
                          </SelectItem>
                          <SelectItem value="RESOLVED">{t("contact_management.status.resolved")}</SelectItem>
                          <SelectItem value="SPAM">{t("contact_management.status.spam")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-[#4B5563]">
                      {t("contact_management.update_dialog.notes_label")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("contact_management.update_dialog.notes_placeholder")}
                        {...field}
                        value={field.value || ""}
                        className="border-[#E5E7EB] focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
                  onClick={() => {
                    setUpdateDialogOpen(false);
                    setSelectedSubmission(null);
                  }}
                >
                  {t("contact_management.update_dialog.cancel")}
                </Button>
                <Button
                  type="submit"
                  className=""
                >
                  {t("contact_management.update_dialog.update")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {t("contact_management.delete_dialog.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[#4B5563]">
              {t("contact_management.delete_dialog.desc")}{" "}
              <span className="font-semibold text-[#1F2937]">
                {selectedSubmission?.name}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("contact_management.update_dialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
              onClick={handleDeleteSubmission}
            >
              {t("contact_management.delete_dialog.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactManagementPage;
