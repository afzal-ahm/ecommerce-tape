import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { inventory } from "@/api/adminService";
import { AlertCircle, X } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";

interface AlertItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  stock: number;
}

interface InventoryAlertResponse {
  alerts: AlertItem[];
  count: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function InventoryAlertNotification() {
  const [inventoryAlerts, setInventoryAlerts] =
    useState<InventoryAlertResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const response = await inventory.getInventoryAlerts();

        if (response.success) {
          setInventoryAlerts(response.data);

          // Show a toast notification for critical alerts (out of stock)
          if (response.data.outOfStockCount > 0) {
            const outOfStockItem = response.data.alerts.find(
              (item: AlertItem) => item.stock === 0
            );
            toast.error(
              `${response.data.outOfStockCount} products are out of stock!`,
              {
                description: "Check inventory status",
                action: {
                  label: "View",
                  onClick: () =>
                    outOfStockItem &&
                    (window.location.href = `/products/${outOfStockItem.productId}`),
                },
              }
            );
          }
        }
      } catch (err) {
        console.error("Error fetching inventory alerts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Refresh alerts every 5 minutes
    const intervalId = setInterval(fetchAlerts, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Don't show anything while loading or if dismissed
  if (loading || dismissed || !inventoryAlerts || inventoryAlerts.count === 0) {
    return null;
  }

  // Handle dismiss
  const handleDismiss = () => {
    setDismissed(true);
  };

  const hasOutOfStock = inventoryAlerts.outOfStockCount > 0;
  const firstAlert = inventoryAlerts.alerts[0];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
        hasOutOfStock ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
      }`}
    >
      <AlertCircle
        className={`h-4 w-4 ${hasOutOfStock ? "text-red-500" : "text-amber-500"}`}
      />
      <span className="flex-1">
        {hasOutOfStock
          ? `⚠️ ${inventoryAlerts.outOfStockCount} item${inventoryAlerts.outOfStockCount > 1 ? "s" : ""} out of stock!`
          : `${inventoryAlerts.lowStockCount} item${inventoryAlerts.lowStockCount > 1 ? "s" : ""} low on stock`}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className={`h-6 px-2 ${hasOutOfStock ? "hover:bg-red-100" : "hover:bg-amber-100"}`}
        asChild
      >
        <Link to={`/products/${firstAlert.productId}`}>View</Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-6 w-6 p-0 ${hasOutOfStock ? "hover:bg-red-100" : "hover:bg-amber-100"}`}
        onClick={handleDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
