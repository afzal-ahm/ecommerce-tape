import { useAuth } from "@/context/AuthContext";
import { Resource, Action } from "@/types/admin";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

interface PermissionGuardProps {
  children: React.ReactNode;
  resource: Resource;
  action: Action;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  children,
  resource,
  action,
  fallback,
}: PermissionGuardProps) {
  const { admin } = useAuth();

  // Check if user has permission
  const hasPermission =
    admin?.role === "SUPER_ADMIN" ||
    admin?.permissions?.includes(`${resource}:${action}`);

  // If user has permission, render children
  if (hasPermission) {
    return <>{children}</>;
  }

  // If fallback is provided, render it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback
  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-10 w-10 text-amber-600" />
          <div>
            <h3 className="text-lg font-medium text-amber-800">
              Permission Denied
            </h3>
            <p className="text-amber-700">
              You don't have permission to {action} {resource.toLowerCase()}.
              Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Specific UI guards for common scenarios
export function CreateButton({
  children,
  resource,
  ...props
}: React.ComponentProps<typeof Button> & { resource: Resource }) {
  return (
    <PermissionGuard resource={resource} action={Action.CREATE} fallback={null}>
      <Button {...props}>{children}</Button>
    </PermissionGuard>
  );
}

export function EditButton({
  children,
  resource,
  ...props
}: React.ComponentProps<typeof Button> & { resource: Resource }) {
  return (
    <PermissionGuard resource={resource} action={Action.UPDATE} fallback={null}>
      <Button {...props}>{children}</Button>
    </PermissionGuard>
  );
}

export function DeleteButton({
  children,
  resource,
  ...props
}: React.ComponentProps<typeof Button> & { resource: Resource }) {
  return (
    <PermissionGuard resource={resource} action={Action.DELETE} fallback={null}>
      <Button {...props}>{children}</Button>
    </PermissionGuard>
  );
}
