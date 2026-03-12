import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, Navigate, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Resource, Action } from "@/types/admin";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  LogOut,
  Menu,
  X,
  Tag,
  Ticket,
  Mail,
  MessageSquare,
  HelpCircle,
  CreditCard,
  RotateCcw,
  ChevronDown,
  Circle,
  Settings,
  Layers,
  Eye,
  Truck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeRender } from "@/components/SafeRender";
import InventoryAlertNotification from "@/components/ui/InventoryAlertNotification";
import { useLanguage } from "@/context/LanguageContext";

interface NavItemProps {
  href: string;
  icon: ReactNode;
  title: string;
  onClick?: () => void;
  hasPermission: boolean;
}

const NavItem = ({
  href,
  icon,
  title,
  onClick,
  hasPermission = true,
}: NavItemProps) => {
  const location = useLocation();
  const isActive =
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  if (!hasPermission) return null;

  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
        isActive
          ? "bg-[#E8F5E9] text-[#2E7D32] font-semibold"
          : "text-white hover:bg-[#0d4d52] font-medium"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-0.5 bg-[#2E7D32] rounded-r-full" />
      )}
      <span className="flex shrink-0 items-center justify-center text-[1.125rem]">
        {icon}
      </span>
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
};

interface CollapsibleNavItemProps {
  title: string;
  icon: ReactNode;
  children: Array<{
    href: string;
    title: string;
    icon?: ReactNode;
    hasPermission: boolean;
  }>;
  isOpen: boolean;
  onToggle: () => void;
  onClick?: () => void;
}

const CollapsibleNavItem = ({
  title,
  icon,
  children,
  isOpen,
  onToggle,
  onClick,
}: CollapsibleNavItemProps) => {
  const location = useLocation();
  const hasActiveChild = children.some(
    (child) =>
      child.hasPermission &&
      (location.pathname === child.href ||
        location.pathname.startsWith(`${child.href}/`))
  );

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    onToggle();
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={handleToggle}
        className={cn(
          "relative flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-all w-full text-left",
          hasActiveChild
            ? "bg-[#E8F5E9] text-[#2E7D32] font-semibold"
            : "text-white hover:bg-[#0d4d52] font-medium"
        )}
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="flex shrink-0 items-center justify-center text-[1.125rem]">
            {icon}
          </span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-300 ease-in-out flex-shrink-0",
            isOpen ? "rotate-180" : "rotate-0",
            hasActiveChild ? "text-[#2E7D32]" : "text-white"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-0.5 pl-4 mt-1">
          {children.map((child) => {
            if (!child.hasPermission) return null;
            const isActive =
              location.pathname === child.href ||
              location.pathname.startsWith(`${child.href}/`);

            return (
              <Link
                key={child.href}
                to={child.href}
                onClick={onClick}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-[#E8F5E9] text-[#2E7D32] font-medium"
                    : "text-[#cbd5e1] hover:bg-[#0d4d52] hover:text-white font-normal"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-[#2E7D32] rounded-r-full" />
                )}
                <span className={cn(
                  "flex shrink-0 items-center justify-center text-[0.875rem]",
                  isActive ? "text-[#2E7D32]" : "text-[#94a3b8]"
                )}>
                  {child.icon || (
                    <Circle className="h-2 w-2 fill-current" />
                  )}
                </span>
                <span className="text-sm">{child.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const hasPermissionFor = (
  admin: { role?: string; permissions?: string[] } | null,
  resource: Resource,
  action?: Action
): boolean => {
  if (admin?.role === "SUPER_ADMIN") return true;

  if (!admin?.permissions || !Array.isArray(admin.permissions)) return false;

  const resourcePrefix = `${resource}:`;

  if (action) {
    const permissionString = `${resource}:${action}`;
    return admin.permissions.some((perm: string) => perm === permissionString);
  } else {
    return admin.permissions.some((perm: string) =>
      perm.startsWith(resourcePrefix)
    );
  }
};

export default function DashboardLayout() {
  const { admin, isAuthenticated, logout, isLoading } = useAuth();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    products: false,
    orders: false,
    users: false,
    support: false,
    settings: false,
  });

  const location = useLocation();

  // Auto-open section if current path matches (accordion - only one open at a time)
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/products") || path.startsWith("/brands") || path.startsWith("/categories") || path.startsWith("/attributes")) {
      setOpenSections({
        products: true,
        orders: false,
        users: false,
        support: false,
        settings: false,
      });
    } else if (path.startsWith("/orders") || path.startsWith("/return-requests") || path.startsWith("/coupons")) {
      setOpenSections({
        products: false,
        orders: true,
        users: false,
        support: false,
        settings: false,
      });
    } else if (path.startsWith("/users") || path.startsWith("/partner") || path.startsWith("/referrals")) {
      setOpenSections({
        products: false,
        orders: false,
        users: true,
        support: false,
        settings: false,
      });
    } else if (path.startsWith("/contact-management") || path.startsWith("/reviews-management") || path.startsWith("/faq-management")) {
      setOpenSections({
        products: false,
        orders: false,
        users: false,
        support: true,
        settings: false,
      });
    } else if (path.startsWith("/settings") || path.startsWith("/moq-settings") || path.startsWith("/pricing-slabs") || path.startsWith("/payment-settings") || path.startsWith("/payment-gateway-settings") || path.startsWith("/price-visibility-settings") || path.startsWith("/shiprocket-settings") || path.startsWith("/parcelx-settings") || path.startsWith("/shipping-settings")) {
      setOpenSections({
        products: false,
        orders: false,
        users: false,
        support: false,
        settings: true,
      });
    } else {
      // Close all sections if on dashboard
      setOpenSections({
        products: false,
        orders: false,
        users: false,
        support: false,
        settings: false,
      });
    }
  }, [location.pathname]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const isCurrentlyOpen = prev[section];
      // If opening a section, close all others (accordion behavior)
      if (!isCurrentlyOpen) {
        return {
          products: false,
          orders: false,
          users: false,
          support: false,
          settings: false,
          [section]: true,
        };
      }
      // If closing, just close this section
      return {
        ...prev,
        [section]: false,
      };
    });
  };

  // Prevent body scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg text-muted-foreground">{t("admin.loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[240px] flex-col bg-[#0A3B3F]    z-30 flex-shrink-0">
        <div className="flex h-16 items-center   px-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 font-semibold text-[#dde7f4] text-base"
          >
            <Package className="h-5 w-5 text-[#4CAF50]" />
            <span>{t("admin.admin_dashboard")}</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto scrollbar-hide">
          <SafeRender>
            <div className="flex flex-col gap-0.5">
              {/* Dashboard - Single Item */}
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard className="h-[1.125rem] w-[1.125rem]" />}
                title={t("nav.dashboard")}
                hasPermission={hasPermissionFor(
                  admin,
                  Resource.DASHBOARD,
                  Action.READ
                )}
              />

              {/* Products - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.products")}
                icon={<Package className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.products}
                onToggle={() => toggleSection("products")}
                children={[
                  {
                    href: "/products",
                    title: t("nav.all_products"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/products/new",
                    title: t("nav.add_product"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.CREATE
                    ),
                  },
                  {
                    href: "/variants",
                    title: "Variant Groups",
                    icon: <Layers className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.UPDATE
                    ),
                  },


                  {
                    href: "/brands",
                    title: t("nav.brands"),
                    icon: <Tags className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.BRANDS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/categories",
                    title: t("nav.categories"),
                    icon: <Tags className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.CATEGORIES,
                      Action.READ
                    ),
                  },
                  {
                    href: "/attributes",
                    title: t("nav.attributes"),
                    icon: <Tag className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Orders - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.orders")}
                icon={<ShoppingCart className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.orders}
                onToggle={() => toggleSection("orders")}
                children={[
                  {
                    href: "/orders",
                    title: t("nav.all_orders"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.ORDERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/return-requests",
                    title: t("nav.return_requests"),
                    icon: <RotateCcw className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.ORDERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/coupons",
                    title: t("nav.coupons"),
                    icon: <Ticket className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.COUPONS,
                      Action.READ
                    ),
                  },
                ]}
              />


              {/* Users - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.users")}
                icon={<Users className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.users}
                onToggle={() => toggleSection("users")}
                children={[
                  {
                    href: "/users",
                    title: t("nav.users"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.USERS,
                      Action.READ
                    ),
                  },
                  // {
                  //   href: "/partner",
                  //   title: t("nav.partners"),
                  //   icon: <Users className="h-3 w-3" />,
                  //   hasPermission:
                  //     admin?.role === "SUPER_ADMIN" ||
                  //     hasPermissionFor(admin, Resource.USERS, Action.READ),
                  // },
                  // {
                  //   href: "/referrals",
                  //   title: t("nav.referrals"),
                  //   icon: <Users className="h-3 w-3" />,
                  //   hasPermission: hasPermissionFor(
                  //     admin,
                  //     Resource.USERS,
                  //     Action.READ
                  //   ),
                  // },
                ]}
              />

              {/* Support - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.support")}
                icon={<HelpCircle className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.support}
                onToggle={() => toggleSection("support")}
                children={[
                  {
                    href: "/contact-management",
                    title: t("nav.contact"),
                    icon: <Mail className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.CONTACT,
                      Action.READ
                    ),
                  },
                  {
                    href: "/reviews-management",
                    title: t("nav.reviews"),
                    icon: <MessageSquare className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.REVIEWS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/faq-management",
                    title: t("nav.faq"),
                    icon: <HelpCircle className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.FAQS,
                      Action.READ
                    ),
                  },
                  // {
                  //   href: "/admins",
                  //   title: "Admins",
                  //   icon: <Users className="h-3 w-3" />,
                  //   hasPermission: hasPermissionFor(
                  //     admin,
                  //     Resource.ADMINS,
                  //     Action.READ
                  //   ),
                  // },
                  // {
                  //   href: "/admins/new",
                  //   title: "Add Admin",
                  //   icon: <Users className="h-3 w-3" />,
                  //   hasPermission: hasPermissionFor(
                  //     admin,
                  //     Resource.ADMINS,
                  //     Action.CREATE
                  //   ),
                  // }
                ]}
              />

              {/* Settings - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.settings")}
                icon={<Settings className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.settings}
                onToggle={() => toggleSection("settings")}
                children={[

                  {
                    href: "/price-visibility-settings",
                    title: t("nav.price_visibility"),
                    icon: <Eye className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/moq-settings",
                    title: t("nav.moq"),
                    icon: <Settings className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/pricing-slabs",
                    title: t("nav.pricing_slabs"),
                    icon: <Layers className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/payment-settings",
                    title: t("nav.payment"),
                    icon: <CreditCard className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/payment-gateway-settings",
                    title: t("nav.gateway_keys"),
                    icon: <CreditCard className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/parcelx-settings",
                    title: t("nav.parcelx"),
                    icon: <Truck className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/shipping-settings",
                    title: t("nav.shipping"),
                    icon: <Truck className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/settings",
                    title: t("nav.language"),
                    icon: <Settings className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/change-password",
                    title: t("nav.change_password"),
                    icon: <Lock className="h-3 w-3" />,
                    hasPermission: true,
                  },
                ]}
              />
            </div>
          </SafeRender>
        </nav>
        <div className="  p-4 bg-[#0A3B3F]">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff5ff] text-[#202021] font-medium text-sm">
              {admin?.firstName?.charAt(0) || admin?.email?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-[#eff5ff] truncate">
                {admin?.firstName
                  ? `${admin.firstName} ${admin.lastName}`
                  : admin?.email}
              </span>
              <span className="text-xs text-[#eff5ff] capitalize">
                {admin?.role === "SUPER_ADMIN"
                  ? t("admin.role.super_admin")
                  : admin?.role === "ADMIN"
                    ? t("admin.role.admin")
                    : t("admin.role.user")}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start  hover:bg-[#F3F4F6] hover:text-[#1F2937] text-sm h-9"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t("admin.logout")}</span>
          </Button>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1F2937]/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[240px] transform bg-[#0A3B3F] transition-transform duration-300 ease-in-out lg:hidden flex flex-col h-full shadow-xl",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between   px-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 font-semibold text-[#dde7f4] text-base"
            onClick={toggleMobileMenu}
          >
            <Package className="h-5 w-5 text-[#4CAF50]" />
            <span>{t("admin.admin_dashboard")}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-[#F3F4F6] hover:text-[#202021] text-[#eff5ff]"
            onClick={toggleMobileMenu}
          >
            <X className="h-5 w-5 " />
          </Button>
        </div>
        <nav className="flex-1 p-3 pb-20 overflow-y-auto scrollbar-hide">
          <SafeRender>
            <div className="flex flex-col gap-0.5">
              {/* Dashboard - Single Item */}
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard className="h-[1.125rem] w-[1.125rem]" />}
                title={t("nav.dashboard")}
                onClick={toggleMobileMenu}
                hasPermission={hasPermissionFor(
                  admin,
                  Resource.DASHBOARD,
                  Action.READ
                )}
              />

              {/* Products - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.products")}
                icon={<Package className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.products}
                onToggle={() => toggleSection("products")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/products",
                    title: t("nav.all_products"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/products/new",
                    title: t("nav.add_product"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.CREATE
                    ),
                  },
                  {
                    href: "/brands",
                    title: t("nav.brands"),
                    icon: <Tags className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.BRANDS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/categories",
                    title: t("nav.categories"),
                    icon: <Tags className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.CATEGORIES,
                      Action.READ
                    ),
                  },
                  {
                    href: "/attributes",
                    title: t("nav.attributes"),
                    icon: <Tag className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Orders - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.orders")}
                icon={<ShoppingCart className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.orders}
                onToggle={() => toggleSection("orders")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/orders",
                    title: t("nav.all_orders"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.ORDERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/return-requests",
                    title: t("nav.return_requests"),
                    icon: <RotateCcw className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.ORDERS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/coupons",
                    title: t("nav.coupons"),
                    icon: <Ticket className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.COUPONS,
                      Action.READ
                    ),
                  },
                ]}
              />



              {/* Users - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.users")}
                icon={<Users className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.users}
                onToggle={() => toggleSection("users")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/users",
                    title: t("nav.users"),
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.USERS,
                      Action.READ
                    ),
                  },
                  // {
                  //   href: "/partner",
                  //   title: t("nav.partners"),
                  //   icon: <Users className="h-3 w-3" />,
                  //   hasPermission:
                  //     admin?.role === "SUPER_ADMIN" ||
                  //     hasPermissionFor(admin, Resource.USERS, Action.READ),
                  // },
                  // {
                  //   href: "/referrals",
                  //   title: t("nav.referrals"),
                  //   icon: <Users className="h-3 w-3" />,
                  //   hasPermission: hasPermissionFor(
                  //     admin,
                  //     Resource.USERS,
                  //     Action.READ
                  //   ),
                  // },
                ]}
              />

              {/* Support - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.support")}
                icon={<HelpCircle className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.support}
                onToggle={() => toggleSection("support")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/contact-management",
                    title: t("nav.contact"),
                    icon: <Mail className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.CONTACT,
                      Action.READ
                    ),
                  },
                  {
                    href: "/reviews-management",
                    title: t("nav.reviews"),
                    icon: <MessageSquare className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.REVIEWS,
                      Action.READ
                    ),
                  },
                  {
                    href: "/faq-management",
                    title: t("nav.faq"),
                    icon: <HelpCircle className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.FAQS,
                      Action.READ
                    ),
                  },
                ]}
              />

              {/* Settings - Collapsible */}
              <CollapsibleNavItem
                title={t("nav.settings")}
                icon={<Settings className="h-[1.125rem] w-[1.125rem]" />}
                isOpen={openSections.settings}
                onToggle={() => toggleSection("settings")}
                onClick={toggleMobileMenu}
                children={[
                  {
                    href: "/price-visibility-settings",
                    title: t("nav.price_visibility"),
                    icon: <Eye className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },

                  {
                    href: "/moq-settings",
                    title: t("nav.moq"),
                    icon: <Settings className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/pricing-slabs",
                    title: t("nav.pricing_slabs"),
                    icon: <Layers className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.PRODUCTS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/payment-settings",
                    title: t("nav.payment"),
                    icon: <CreditCard className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/payment-gateway-settings",
                    title: t("nav.gateway_keys"),
                    icon: <CreditCard className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/parcelx-settings",
                    title: t("nav.parcelx"),
                    icon: <Truck className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/shipping-settings",
                    title: t("nav.shipping"),
                    icon: <Truck className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/settings",
                    title: t("nav.language"),
                    icon: <Settings className="h-3 w-3" />,
                    hasPermission: hasPermissionFor(
                      admin,
                      Resource.SETTINGS,
                      Action.UPDATE
                    ),
                  },
                  {
                    href: "/change-password",
                    title: t("nav.change_password"),
                    icon: <Lock className="h-3 w-3" />,
                    hasPermission: true,
                  },
                ]}
              />
            </div>
          </SafeRender>
        </nav>
        <div className="  p-4 bg-[#0A3B3F]">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff5ff] text-[#202021] font-medium text-sm">
              {admin?.firstName?.charAt(0) || admin?.email?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-[#eff5ff] truncate">
                {admin?.firstName
                  ? `${admin.firstName} ${admin.lastName}`
                  : admin?.email}
              </span>
              <span className="text-xs text-[#eff5ff] capitalize">
                {admin?.role === "SUPER_ADMIN"
                  ? t("admin.role.super_admin")
                  : admin?.role === "ADMIN"
                    ? t("admin.role.admin")
                    : t("admin.role.user")}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start  hover:bg-[#F3F4F6] hover:text-[#1F2937] text-sm h-9"
            onClick={() => {
              toggleMobileMenu();
              logout();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t("admin.logout")}</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col h-full min-h-0 lg:ml-[240px]">
        {/* Topbar */}
        <header className="flex lg:hidden h-16 items-center justify-between  px-4 lg:px-6 bg-[#0A3B3F] sticky top-0 z-20">
          <div className="flex items-center lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 hover:bg-[#eff5ff] hover:text-[#202021] text-[#eff5ff]"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-5 w-5 " />
            </Button>
            <span className="text-sm font-semibold text-[#eff5ff]">{t("admin.admin_dashboard")}</span>
          </div>

          {/* Inventory Alerts - Desktop */}
          <div className="hidden md:block flex-1 max-w-md">
            <SafeRender>
              <InventoryAlertNotification />
            </SafeRender>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#eff5ff] lg:inline-block">
              {admin?.firstName
                ? `${admin.firstName} ${admin.lastName}`
                : admin?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={logout} className="hover:bg-[#202021] hover:text-[#eff5ff] text-[#eff5ff]">
              <LogOut className="h-5 w-5 text-[#eff5ff]" />
            </Button>
          </div>
        </header>

        {/* Mobile Alert Bar */}
        <div className="lg:hidden">
          <SafeRender>
            <InventoryAlertNotification />
          </SafeRender>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-[#F3F7F6] p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
