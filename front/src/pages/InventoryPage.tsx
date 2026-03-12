import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/inventory/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Stock
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/inventory/remove">
              <MinusCircle className="mr-2 h-4 w-4" />
              Remove Stock
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <h2 className="text-lg font-medium">Inventory Management</h2>
        <p className="mt-2 text-muted-foreground">
          This page is under development. You will be able to manage product
          inventory here.
        </p>
      </div>
    </div>
  );
}
