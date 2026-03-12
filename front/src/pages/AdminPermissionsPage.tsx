import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminUsers } from "@/api/adminService";
import { Resource, Action } from "@/types/admin";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AdminPermissionsPage() {
  const { adminId } = useParams<{ adminId: string }>();
  const { admin: currentAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({
    [Resource.DASHBOARD]: [],
    [Resource.PRODUCTS]: [],
    [Resource.ORDERS]: [],
    [Resource.CATEGORIES]: [],
    [Resource.INVENTORY]: [],
    [Resource.FLAVORS]: [],
    [Resource.WEIGHTS]: [],
    [Resource.COUPONS]: [],
    [Resource.USERS]: [],
  });

  // Check if current user is super admin
  const isSuperAdmin = currentAdmin?.role === "SUPER_ADMIN";

  // Fetch admin data and permissions on component mount
  useEffect(() => {
    if (!adminId) return;

    const fetchAdmins = async () => {
      try {
        setLoading(true);
        const response = await adminUsers.getAllAdmins();
        if (response.data.success) {
          const admin = response.data.data.admins.find(
            (a: any) => a.id === adminId
          );
          if (admin) {
            setAdminData(admin);

            // Initialize permissions from admin data
            const adminPermissions: Record<string, string[]> = {};
            Object.values(Resource).forEach((resource) => {
              adminPermissions[resource] = [];
            });

            // Map existing permissions
            admin.permissions?.forEach((perm: string) => {
              const [resource, action] = perm.split(":");
              if (adminPermissions[resource]) {
                adminPermissions[resource].push(action);
              }
            });

            setPermissions(adminPermissions);
          } else {
            toast.error("Admin not found");
            navigate("/admins");
          }
        } else {
          toast.error("Failed to fetch admin data");
          navigate("/admins");
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
        toast.error("Error fetching admin data");
        navigate("/admins");
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [adminId, navigate]);

  // Handle permission toggles
  const togglePermission = (resource: Resource, action: Action) => {
    setPermissions((prev) => {
      const current = prev[resource] || [];
      const exists = current.includes(action);

      const updated = exists
        ? current.filter((a) => a !== action)
        : [...current, action];

      return {
        ...prev,
        [resource]: updated,
      };
    });
  };

  // Check if a permission is selected
  const hasPermission = (resource: Resource, action: Action): boolean => {
    return permissions[resource]?.includes(action) || false;
  };

  // Toggle all actions for a resource
  const toggleAllForResource = (resource: Resource) => {
    const allActions = [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
    ];
    const currentResourcePermissions = permissions[resource] || [];
    const hasAllPermissions = allActions.every((action) =>
      currentResourcePermissions.includes(action)
    );

    setPermissions((prev) => ({
      ...prev,
      [resource]: hasAllPermissions ? [] : [...allActions],
    }));
  };

  // Format permissions for API call
  const formatPermissionsForApi = () => {
    const result: { resource: string; action: string }[] = [];

    Object.entries(permissions).forEach(([resource, actions]) => {
      // Ensure resource is valid
      if (Object.values(Resource).includes(resource as Resource)) {
        actions.forEach((action) => {
          // Ensure action is valid
          if (Object.values(Action).includes(action as Action)) {
            result.push({ resource, action });
          }
        });
      }
    });

    return result;
  };

  const handleSavePermissions = async () => {
    if (!adminId) return;

    try {
      setSaving(true);
      const formattedPermissions = formatPermissionsForApi();

      const response = await adminUsers.updateAdminPermissions(adminId, {
        permissions: formattedPermissions,
      });

      if (response.data.success) {
        toast.success("Admin permissions updated successfully");
        navigate("/admins");
      } else {
        toast.error(response.data.message || "Failed to update permissions");
      }
    } catch (error: any) {
      console.error("Error updating permissions:", error);
      toast.error(
        error.response?.data?.message || "Error updating permissions"
      );
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            Loading admin data...
          </p>
        </div>
      </div>
    );
  }

  // Only proceed if user is a super admin
  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <p className="text-amber-800">
                Only Super Admins can manage admin permissions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          size="icon"
          className="mr-4"
          onClick={() => navigate("/admins")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Admin Permissions</h1>
          <p className="text-muted-foreground">
            {adminData?.firstName} {adminData?.lastName} ({adminData?.email})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="resources">
            <TabsList className="mb-4">
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsContent value="resources" className="space-y-4">
              {Object.values(Resource).map((resource) => (
                <div key={resource} className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`resource-${resource}-all`}
                        checked={[
                          Action.CREATE,
                          Action.READ,
                          Action.UPDATE,
                          Action.DELETE,
                        ].every((action) =>
                          hasPermission(resource as Resource, action)
                        )}
                        onCheckedChange={() =>
                          toggleAllForResource(resource as Resource)
                        }
                      />
                      <Label
                        htmlFor={`resource-${resource}-all`}
                        className="font-bold capitalize"
                      >
                        {resource.toLowerCase().replace("_", " ")}
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    {Object.values(Action).map((action) => (
                      <div
                        key={`${resource}-${action}`}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`${resource}-${action}`}
                          checked={hasPermission(
                            resource as Resource,
                            action as Action
                          )}
                          onCheckedChange={() =>
                            togglePermission(
                              resource as Resource,
                              action as Action
                            )
                          }
                        />
                        <Label
                          htmlFor={`${resource}-${action}`}
                          className="capitalize"
                        >
                          {action.toLowerCase()}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/admins")}>
            Cancel
          </Button>
          <Button onClick={handleSavePermissions} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              "Save Permissions"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
