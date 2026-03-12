export interface Admin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "SUPPORT_AGENT" | string;
  permissions: string[];
  lastLogin?: string;
  isActive?: boolean;
  language?: string; // e.g., "en", "hi", "es"
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id: string;
  adminId: string;
  resource: string;
  action: "create" | "read" | "update" | "delete" | string;
  createdAt?: string;
  updatedAt?: string;
}

export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  SUPPORT_AGENT = "SUPPORT_AGENT",
}

export enum Resource {
  DASHBOARD = "dashboard",
  ADMINS = "admins",
  USERS = "users",
  PRODUCTS = "products",
  ORDERS = "orders",
  CATEGORIES = "categories",
  REVIEWS = "reviews",
  SETTINGS = "settings",
  INVENTORY = "inventory",
  FLAVORS = "flavors",
  WEIGHTS = "weights",
  COUPONS = "coupons",
  CONTENT = "content",
  CONTACT = "contact",
  FAQS = "faqs",
  ANALYTICS = "analytics",
  BRANDS = "brands",
  BANNERS = "banners",
}

export enum Action {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
}

// Helper functions for permissions
export const formatPermission = (
  resource: Resource,
  action: Action
): string => {
  return `${resource}:${action}`;
};

export const parsePermission = (
  permission: string
): { resource: string; action: string } | null => {
  const parts = permission.split(":");
  if (parts.length !== 2) return null;

  return {
    resource: parts[0],
    action: parts[1],
  };
};
