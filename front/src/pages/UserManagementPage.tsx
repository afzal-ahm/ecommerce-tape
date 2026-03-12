import { useState, useEffect } from "react";
import { customerUsers } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
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
import {
  Users,
  Search,
  MoreVertical,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

// User type definition
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  emailVerified: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// User details dialog component
const UserDetailsDialog = ({
  user,
  open,
  onClose,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
}) => {
  const { t } = useLanguage();
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1F2937]">
            {t("user_management.dialogs.details.title")}
          </DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {t("user_management.dialogs.details.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">{t("user_management.fields.name")}</p>
              <p className="font-medium text-[#1F2937]">
                {user.name || t("user_management.fields.not_provided")}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">{t("user_management.fields.email")}</p>
              <p className="font-medium text-[#1F2937]">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">{t("user_management.fields.phone")}</p>
              <p className="font-medium text-[#1F2937]">
                {user.phone || t("user_management.fields.not_provided")}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">{t("user_management.fields.email_verified")}</p>
              {user.emailVerified ? (
                <Badge className="bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs font-medium">
                  {t("user_management.status.verified")}
                </Badge>
              ) : (
                <Badge className="bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2] text-xs font-medium">
                  {t("user_management.status.not_verified")}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">{t("user_management.fields.role")}</p>
              <Badge className="bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB] text-xs font-medium">
                {user.role}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">{t("user_management.fields.created_at")}</p>
              <p className="font-medium text-[#1F2937]">
                {formatDate(user.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">{t("user_management.fields.last_updated")}</p>
              <p className="font-medium text-[#1F2937]">
                {formatDate(user.updatedAt)}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
            onClick={onClose}
          >
            {t("user_management.dialogs.details.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Edit user dialog component
const EditUserDialog = ({
  user,
  open,
  onClose,
  onSave,
  isSaving,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    userId: string,
    data: { name?: string; phone?: string; email?: string }
  ) => void;
  isSaving: boolean;
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      onSave(user.id, formData);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1F2937]">
            {t("user_management.dialogs.edit.title")}
          </DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {t("user_management.dialogs.edit.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[#4B5563]"
              >
                {t("user_management.fields.name")}
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("user_management.fields.name_placeholder")}
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#4B5563]"
              >
                {t("user_management.fields.email")}
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t("user_management.fields.email_placeholder")}
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-[#4B5563]"
              >
                {t("user_management.fields.phone")}
              </label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t("user_management.fields.phone_placeholder")}
                className="border-[#E5E7EB] focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              type="button"
              className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
              onClick={onClose}
            >
              {t("user_management.dialogs.edit.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className=""
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("user_management.dialogs.edit.saving")}
                </>
              ) : (
                t("user_management.dialogs.edit.save")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Delete confirmation dialog
const DeleteConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) => {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#FFFFFF] border-[#E5E7EB] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1F2937]">
            {t("user_management.dialogs.delete.title")}
          </DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {t("user_management.dialogs.delete.description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
            onClick={onClose}
          >
            {t("user_management.dialogs.delete.cancel") || "Cancel"}
          </Button>
          <Button
            variant="destructive"
            className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("user_management.dialogs.delete.deleting")}
              </>
            ) : (
              t("user_management.dialogs.delete.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main user management page component
export default function UserManagementPage() {
  const { t } = useLanguage();
  // States
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const perPage = 15; // 15 users per page

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch users on mount and when page changes
  useEffect(() => {
    fetchUsers();
  }, [page]);

  // Fetch users function
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await customerUsers.getUsers({
        page,
        limit: perPage,
        search: searchQuery,
      });

      if (response.data.success) {
        // Normalize user objects: backend may return `otpVerified` field
        const normalizedUsers: User[] = (response.data.data.users || []).map(
          (u: any) => ({
            // keep existing fields, but ensure `emailVerified` is present
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            isActive: u.isActive,
            // prefer explicit emailVerified, fallback to otpVerified
            emailVerified: u.emailVerified ?? u.otpVerified ?? false,
            role: u.role,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          })
        );

        setUsers(normalizedUsers);
        setTotalUsers(response.data.data.pagination.total);
        setTotalPages(response.data.data.pagination.pages);
      } else {
        setError(response.data.message || t("user_management.messages.fetch_error"));
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setError(error.message || t("user_management.messages.fetch_exception"));
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page
    setSearching(true);
    fetchUsers();
  };

  // Handle user verification
  const handleVerifyUser = async (userId: string) => {
    try {
      setIsUpdating(true);
      const response = await customerUsers.verifyUserEmail(userId);

      if (response.data.success) {
        toast.success(t("user_management.messages.verify_success"));

        // Update the user in the list
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, emailVerified: true } : user
          )
        );
      } else {
        toast.error(response.data.message || t("user_management.messages.verify_error"));
      }
    } catch (error: any) {
      console.error("Error verifying user email:", error);
      toast.error(
        error.message || t("user_management.messages.verify_exception")
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle edit user
  const handleEditUser = async (
    userId: string,
    data: { name?: string; phone?: string; email?: string }
  ) => {
    try {
      setIsUpdating(true);
      const response = await customerUsers.updateUserDetails(userId, data);

      if (response.data.success) {
        toast.success(t("user_management.messages.update_success"));

        // Update the user in the list
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId
              ? {
                ...user,
                name: data.name || user.name,
                email: data.email || user.email,
                phone: data.phone || user.phone,
              }
              : user
          )
        );

        // Close dialog
        setEditDialogOpen(false);
      } else {
        toast.error(response.data.message || t("user_management.messages.update_error"));
      }
    } catch (error: any) {
      console.error("Error updating user details:", error);
      toast.error(
        error.message || t("user_management.messages.update_exception")
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setIsDeleting(true);
      const response = await customerUsers.deleteUser(selectedUser.id);

      if (response.data.success) {
        toast.success(t("user_management.messages.delete_success"));

        // Remove user from list
        setUsers((prevUsers) =>
          prevUsers.filter((user) => user.id !== selectedUser.id)
        );

        // Close dialog
        setDeleteDialogOpen(false);

        // Refresh users if the list becomes empty
        if (users.length === 1) {
          // Go to previous page if not on first page
          if (page > 1) {
            setPage(page - 1);
          } else {
            fetchUsers();
          }
        }
      } else {
        toast.error(response.data.message || t("user_management.messages.delete_error"));
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || t("user_management.messages.delete_exception"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
            {t("user_management.title")}
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1.5">
            {t("user_management.description")}
          </p>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
      </div>

      {/* Filters Bar */}
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                type="search"
                placeholder={t("user_management.search_placeholder")}
                className="pl-10 border-[#E5E7EB] focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className=""
              disabled={searching}
            >
              {searching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("user_management.searching")}
                </>
              ) : (
                t("user_management.search")
              )}
            </Button>
            {searchQuery && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                  fetchUsers();
                }}
                className="text-[#4B5563] hover:text-[#1F2937]"
              >
                {t("user_management.clear")}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-0">
          {loading && !users.length ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50] mb-4" />
              <p className="text-base text-[#9CA3AF]">{t("user_management.loading")}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FEF2F2] mb-4">
                <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
              </div>
              <p className="text-lg font-semibold text-[#1F2937] mb-1.5">{t("user_management.error_title")}</p>
              <p className="text-[#9CA3AF] mb-6">{error}</p>
              <Button
                className=""
                onClick={fetchUsers}
              >
                {t("user_management.try_again")}
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                <Users className="h-8 w-8 text-[#9CA3AF]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">{t("user_management.no_users")}</h3>
              {searchQuery && (
                <p className="text-sm text-center text-[#9CA3AF] mb-6 max-w-sm">
                  {t("user_management.no_users_desc")}
                </p>
              )}
              {searchQuery && (
                <Button
                  variant="outline"
                  className="border-[#E5E7EB] hover:bg-[#F3F7F6]"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                    fetchUsers();
                  }}
                >
                  {t("user_management.clear_search")}
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-6 hover:bg-[#F3F7F6] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5E9] flex-shrink-0">
                        <Users className="h-6 w-6 text-[#2E7D32]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#1F2937] truncate">
                          {user.name || "—"}
                        </h3>
                        <p className="text-sm text-[#9CA3AF] truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="mb-2">
                          {user.emailVerified ? (
                            <Badge className="bg-[#ECFDF5] text-[#22C55E] border-[#D1FAE5] text-xs font-medium">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              {t("user_management.status.verified")}
                            </Badge>
                          ) : (
                            <Badge className="bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7] text-xs font-medium">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                              {t("user_management.status.not_verified")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#9CA3AF]">
                          {t("user_management.joined")} {formatDate(user.createdAt)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-9 w-9 hover:bg-[#F3F4F6]"
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#4B5563]" />
                            ) : (
                              <MoreVertical className="h-4 w-4 text-[#4B5563]" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#FFFFFF] border-[#E5E7EB] shadow-lg"
                        >
                          <DropdownMenuItem
                            className="text-[#1F2937] hover:bg-[#F3F7F6]"
                            onClick={() => {
                              setSelectedUser(user);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t("user_management.actions.view_details")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-[#1F2937] hover:bg-[#F3F7F6]"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t("user_management.actions.edit")}
                          </DropdownMenuItem>
                          {!user.emailVerified && (
                            <DropdownMenuItem
                              className="text-[#1F2937] hover:bg-[#F3F7F6]"
                              onClick={() => handleVerifyUser(user.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t("user_management.actions.verify_email")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-[#EF4444] hover:bg-[#FEF2F2]"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("user_management.actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination controls */}
          {!loading && !error && users.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#E5E7EB] px-6 py-4">
              <div className="text-sm text-[#9CA3AF]">
                {t("user_management.showing")} <span className="font-medium text-[#1F2937]">{users.length}</span> {t("user_management.of")}{" "}
                <span className="font-medium text-[#1F2937]">{totalUsers}</span> {t("user_management.users_count")}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                      aria-disabled={page === 1}
                      className={
                        page === 1
                          ? "pointer-events-none opacity-50"
                          : "hover:bg-[#F3F7F6]"
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-4 py-2 text-sm text-[#4B5563]">
                      {t("user_management.page")} {page} {t("user_management.of")} {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage(page + 1);
                      }}
                      aria-disabled={page === totalPages}
                      className={
                        page === totalPages
                          ? "pointer-events-none opacity-50"
                          : "hover:bg-[#F3F7F6]"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User details dialog */}
      <UserDetailsDialog
        user={selectedUser}
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
      />

      {/* Edit user dialog */}
      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleEditUser}
        isSaving={isUpdating}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteUser}
        isDeleting={isDeleting}
      />
    </div>
  );
}
