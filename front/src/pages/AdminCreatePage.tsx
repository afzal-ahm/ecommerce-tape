import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminUsers } from "@/api/adminService";
import { Role, Resource, Action } from "@/types/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";

export default function AdminCreatePage() {
  const { admin: currentAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "ADMIN",
  });

  // Add a state for custom permissions
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({
    [Resource.DASHBOARD]: [Action.READ],
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // When role changes, reset custom permissions
    if (name === "role") {
      setUseCustomPermissions(false);
    }
  };

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
      actions.forEach((action) => {
        result.push({ resource, action });
      });
    });

    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.email ||
      !formData.password ||
      !formData.firstName ||
      !formData.lastName
    ) {
      toast.error("All fields are required");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      // Add permissions to the request if using custom permissions
      const requestData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        ...(useCustomPermissions && {
          customPermissions: formatPermissionsForApi(),
        }),
      };

      const response = await adminUsers.registerAdmin(requestData);

      if (response.data.success) {
        toast.success("Admin created successfully");
        navigate("/admins");
      } else {
        toast.error(response.data.message || "Failed to create admin");
      }
    } catch (error: any) {
      console.error("Error creating admin:", error);
      toast.error(error.response?.data?.message || "Error creating admin");
    } finally {
      setLoading(false);
    }
  };

  // Only proceed if user is a super admin
  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <p className="text-amber-800">
                Only Super Admins can create new admin accounts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Admin</h1>
        <p className="text-muted-foreground">
          Add a new administrator to the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                {Object.keys(Role).map((role) => (
                  <option key={role} value={role}>
                    {role.replace("_", " ")}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                Roles have default permissions, but you can customize them
                below.
              </p>
            </div>

            {/* Custom Permissions Section */}
            <div className="border-t pt-4 mt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="customPermissions"
                  checked={useCustomPermissions}
                  onCheckedChange={(checked) =>
                    setUseCustomPermissions(!!checked)
                  }
                />
                <Label htmlFor="customPermissions" className="font-medium">
                  Customize permissions for this admin
                </Label>
              </div>

              {useCustomPermissions && (
                <div className="space-y-6">
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
                                {resource.replace("_", " ")}
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
                                  {action}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>

            <CardFooter className="flex justify-between px-0 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admins")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="mr-2">Creating...</span>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </>
                ) : (
                  "Create Admin"
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
