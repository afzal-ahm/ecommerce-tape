import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { adminUsers } from "@/api/adminService";
import { Admin, Role } from "@/types/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const { admin: currentAdmin } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = currentAdmin?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminUsers.getAllAdmins();
      if (response.data.success) {
        setAdmins(response.data.data.admins);
      } else {
        toast.error("Failed to fetch admins");
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Error fetching admin users");
    } finally {
      setLoading(false);
    }
  };

  const updateAdminStatus = async (adminId: string, isActive: boolean) => {
    try {
      const response = await adminUsers.updateAdminRole(adminId, {
        role: admins.find((a) => a.id === adminId)?.role || "ADMIN",
        isActive,
      });

      if (response.data.success) {
        toast.success(
          `Admin ${isActive ? "activated" : "deactivated"} successfully`
        );
        fetchAdmins();
      } else {
        toast.error("Failed to update admin status");
      }
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast.error("Error updating admin status");
    }
  };

  const updateAdminRole = async (adminId: string, role: string) => {
    try {
      const response = await adminUsers.updateAdminRole(adminId, { role });

      if (response.data.success) {
        toast.success("Admin role updated successfully");
        fetchAdmins();
      } else {
        toast.error("Failed to update admin role");
      }
    } catch (error) {
      console.error("Error updating admin role:", error);
      toast.error("Error updating admin role");
    }
  };

  const deleteAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;

    try {
      const response = await adminUsers.deleteAdmin(adminId);

      if (response.data.success) {
        toast.success("Admin deleted successfully");
        fetchAdmins();
      } else {
        toast.error("Failed to delete admin");
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error("Error deleting admin");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-500 hover:bg-red-600";
      case "ADMIN":
        return "bg-blue-500 hover:bg-blue-600";
      case "MANAGER":
        return "bg-primary hover:bg-primary/90";
      case "CONTENT_EDITOR":
        return "bg-purple-500 hover:bg-purple-600";
      case "SUPPORT_AGENT":
        return "bg-yellow-500 hover:bg-yellow-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        {/* {isSuperAdmin && (
          <Button asChild>
            <Link to="/admins/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Admin
            </Link>
          </Button>
        )} */}
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : admins.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p>No admin users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {admins.map((admin) => (
            <Card
              key={admin.id}
              className={admin.isActive === false ? "opacity-70" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {admin.firstName} {admin.lastName}
                  </CardTitle>
                  <Badge className={getRoleBadgeColor(admin.role)}>
                    {admin.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{admin.email}</p>
              </CardHeader>

              <CardContent>
                <div className="text-sm">
                  <p className="mb-1">
                    <span className="font-medium">Status: </span>
                    <Badge
                      variant={admin.isActive !== false ? "default" : "outline"}
                    >
                      {admin.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                  </p>

                  <p className="mb-1">
                    <span className="font-medium">Last Login: </span>
                    {admin.lastLogin
                      ? new Date(admin.lastLogin).toLocaleString()
                      : "Never"}
                  </p>

                  <Separator className="my-2" />

                  {isSuperAdmin && admin.id !== currentAdmin?.id && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {admin.isActive !== false ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateAdminStatus(admin.id, false)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateAdminStatus(admin.id, true)}
                        >
                          Activate
                        </Button>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAdmin(admin.id)}
                      >
                        Delete
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(`/admins/permissions/${admin.id}`)
                        }
                      >
                        Permissions
                      </Button>

                      <select
                        className="px-2 py-1 text-sm border rounded"
                        value={admin.role}
                        onChange={(e) =>
                          updateAdminRole(admin.id, e.target.value)
                        }
                      >
                        {Object.keys(Role).map((role) => (
                          <option key={role} value={role}>
                            {role.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isSuperAdmin && (
        <div className="rounded-lg border bg-amber-50 p-4 mt-4">
          <p className="text-amber-800">
            Only Super Admins can manage other admin users. Contact your
            administrator for assistance.
          </p>
        </div>
      )}
    </div>
  );
}
