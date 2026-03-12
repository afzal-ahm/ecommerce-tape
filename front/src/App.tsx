import PartnerPage from "@/pages/partner";
import PartnerDetailsPage from "@/pages/PartnerDetailsPage";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/ProductsPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailsPage from "@/pages/OrderDetailsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import AttributesPage from "@/pages/AttributesPage";
import AttributeValuesPage from "@/pages/AttributeValuesPage";
import CouponsPage from "@/pages/CouponsPage";
import AdminsPage from "@/pages/AdminsPage";
import AdminCreatePage from "@/pages/AdminCreatePage";
import AdminPermissionsPage from "@/pages/AdminPermissionsPage";
import ContactManagementPage from "@/pages/ContactManagementPage";
import ReviewsManagementPage from "@/pages/ReviewsManagementPage";
import FAQManagementPage from "@/pages/FAQManagementPage";
import FAQCreatePage from "@/pages/FAQCreatePage";
import NotFoundPage from "@/pages/NotFoundPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProductDetailPage from "@/pages/ProductDetailPage";
import ProductCreatePage from "@/pages/ProductCreatePage";
import { useAuth } from "@/context/AuthContext";
import { Resource, Action } from "@/types/admin";
import { PermissionGuard } from "@/components/PermissionGuard";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import UserManagementPage from "@/pages/UserManagementPage";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import BrandsPage from "@/pages/BrandsPage";
import ProductSectionsPage from "@/pages/ProductSections";
import BannersPage from "@/pages/BannersPage";
import PaymentSettingsPage from "@/pages/PaymentSettingsPage";
import PriceVisibilitySettingsPage from "@/pages/PriceVisibilitySettingsPage";
import FlashSalesPage from "@/pages/FlashSalesPage";
import ReferralsPage from "@/pages/ReferralsPage";
import ReturnRequestsPage from "@/pages/ReturnRequestsPage";
import MOQSettingsPage from "@/pages/MOQSettingsPage";
import PricingSlabsPage from "@/pages/PricingSlabsPage";
import PaymentGatewaySettingsPage from "@/pages/PaymentGatewaySettingsPage";
import ShiprocketSettingsPage from "@/pages/ShiprocketSettingsPage";
import ParcelXSettingsPage from "@/pages/ParcelXSettingsPage";
import ShippingSettingsPage from "@/pages/ShippingSettingsPage";
import SettingsPage from "@/pages/SettingsPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import VariantManagerPage from "@/pages/VariantManagerPage";

// Protected Route Component
const ProtectedRoute = ({
  children,
  resource,
  action = Action.READ,
  superAdminOnly = false,
}: {
  children: React.ReactNode;
  resource?: Resource;
  action?: Action;
  superAdminOnly?: boolean;
}) => {
  const { admin, isAuthenticated } = useAuth();

  // Not authenticated at all
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super admin only route
  if (superAdminOnly && admin?.role !== "SUPER_ADMIN") {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-10 w-10 text-red-600" />
            <div>
              <h3 className="text-lg font-medium text-red-800">
                Access Denied
              </h3>
              <p className="text-red-700">
                This page is only accessible to Super Administrators.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Permission-based route
  if (resource && action) {
    const hasPermission =
      admin?.role === "SUPER_ADMIN" ||
      admin?.permissions?.includes(`${resource}:${action}`);

    if (!hasPermission) {
      return (
        <PermissionGuard resource={resource} action={action}>
          {children}
        </PermissionGuard>
      );
    }
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={<LoginPage />}
          errorElement={<ErrorBoundary />}
        />

        {/* Authenticated routes with DashboardLayout */}
        <Route
          path="/"
          element={<DashboardLayout />}
          errorElement={<ErrorBoundary />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route
            path="dashboard"
            element={
              <ProtectedRoute
                resource={Resource.DASHBOARD}
                action={Action.READ}
              >
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="dashboard/analytics"
            element={
              <ProtectedRoute
                resource={Resource.ANALYTICS}
                action={Action.READ}
              >
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="products"
            element={
              <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="products/new"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.CREATE}
              >
                <ProductCreatePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="products/edit/:id"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.UPDATE}
              >
                <ProductsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="products/:id"
            element={
              <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                <ProductDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="orders"
            element={
              <ProtectedRoute resource={Resource.ORDERS} action={Action.READ}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="orders/:id"
            element={
              <ProtectedRoute resource={Resource.ORDERS} action={Action.READ}>
                <OrderDetailsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="categories"
            element={
              <ProtectedRoute
                resource={Resource.CATEGORIES}
                action={Action.READ}
              >
                <CategoriesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="categories/new"
            element={
              <ProtectedRoute
                resource={Resource.CATEGORIES}
                action={Action.CREATE}
              >
                <CategoriesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="categories/:id"
            element={
              <ProtectedRoute
                resource={Resource.CATEGORIES}
                action={Action.UPDATE}
              >
                <CategoriesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="attributes"
            element={
              <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                <AttributesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="attributes/new"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.CREATE}
              >
                <AttributesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="attributes/:id"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.UPDATE}
              >
                <AttributesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="attributes/:attributeId/values"
            element={
              <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                <AttributeValuesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="attributes/:attributeId/values/new"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.CREATE}
              >
                <AttributeValuesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="attributes/:attributeId/attribute-values/:id"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.UPDATE}
              >
                <AttributeValuesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="attribute-values/:id/edit"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.UPDATE}
              >
                <AttributeValuesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="coupons"
            element={
              <ProtectedRoute resource={Resource.COUPONS} action={Action.READ}>
                <CouponsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="coupons/new"
            element={
              <ProtectedRoute
                resource={Resource.COUPONS}
                action={Action.CREATE}
              >
                <CouponsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="coupons/:id"
            element={
              <ProtectedRoute
                resource={Resource.COUPONS}
                action={Action.UPDATE}
              >
                <CouponsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="payment-settings"
            element={
              <ProtectedRoute
                resource={Resource.SETTINGS}
                action={Action.UPDATE}
              >
                <PaymentSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="price-visibility-settings"
            element={
              <ProtectedRoute
                resource={Resource.SETTINGS}
                action={Action.UPDATE}
              >
                <PriceVisibilitySettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="payment-gateway-settings"
            element={
              <ProtectedRoute
                resource={Resource.SETTINGS}
                action={Action.UPDATE}
              >
                <PaymentGatewaySettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="shiprocket-settings"
            element={
              <ProtectedRoute
                resource={Resource.SETTINGS}
                action={Action.UPDATE}
              >
                <ShiprocketSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="parcelx-settings"
            element={
              <ProtectedRoute
                resource={Resource.SETTINGS}
                action={Action.UPDATE}
              >
                <ParcelXSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="shipping-settings"
            element={
              <ProtectedRoute
                resource={Resource.SETTINGS}
                action={Action.UPDATE}
              >
                <ShippingSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="flash-sales"
            element={
              <ProtectedRoute resource={Resource.PRODUCTS} action={Action.READ}>
                <FlashSalesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="flash-sales/new"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.CREATE}
              >
                <FlashSalesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="flash-sales/:id"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.UPDATE}
              >
                <FlashSalesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="moq-settings"
            element={
              <ProtectedRoute
                resource={Resource.SETTINGS}
                action={Action.UPDATE}
              >
                <MOQSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="pricing-slabs"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.UPDATE}
              >
                <PricingSlabsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="settings"
            element={
              <ProtectedRoute
                resource={Resource.SETTINGS}
                action={Action.UPDATE}
              >
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="referrals"
            element={
              <ProtectedRoute resource={Resource.USERS} action={Action.READ}>
                <ReferralsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="return-requests"
            element={
              <ProtectedRoute resource={Resource.ORDERS} action={Action.READ}>
                <ReturnRequestsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="admins"
            element={
              <ProtectedRoute superAdminOnly={true}>
                <AdminsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="admins/new"
            element={
              <ProtectedRoute superAdminOnly={true}>
                <AdminCreatePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="admins/permissions/:adminId"
            element={
              <ProtectedRoute superAdminOnly={true}>
                <AdminPermissionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="users"
            element={
              <ProtectedRoute resource={Resource.USERS} action={Action.READ}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="contact-management"
            element={
              <ProtectedRoute resource={Resource.CONTACT} action={Action.READ}>
                <ContactManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="reviews-management"
            element={
              <ProtectedRoute resource={Resource.REVIEWS} action={Action.READ}>
                <ReviewsManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="product-sections"
            element={
              <ProtectedRoute
                resource={Resource.PRODUCTS}
                action={Action.UPDATE}
              >
                <ProductSectionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="faq-management"
            element={
              <ProtectedRoute resource={Resource.FAQS} action={Action.READ}>
                <FAQManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="faq-management/create"
            element={
              <ProtectedRoute resource={Resource.FAQS} action={Action.CREATE}>
                <FAQCreatePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="brands"
            element={
              <ProtectedRoute resource={Resource.BRANDS} action={Action.READ}>
                <BrandsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="variants"
            element={
              <ProtectedRoute resource={Resource.PRODUCTS} action={Action.UPDATE}>
                <VariantManagerPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="banners/new"
            element={
              <ProtectedRoute
                resource={Resource.BANNERS}
                action={Action.CREATE}
              >
                <BannersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="banners/:id"
            element={
              <ProtectedRoute
                resource={Resource.BANNERS}
                action={Action.UPDATE}
              >
                <BannersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="banners"
            element={
              <ProtectedRoute resource={Resource.BANNERS} action={Action.READ}>
                <BannersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="partner"
            element={
              <ProtectedRoute superAdminOnly={true}>
                <PartnerPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="partners/:id"
            element={
              <ProtectedRoute superAdminOnly={true}>
                <PartnerDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>

      <Toaster position="top-center" richColors />
    </>
  );
};

export default App;
