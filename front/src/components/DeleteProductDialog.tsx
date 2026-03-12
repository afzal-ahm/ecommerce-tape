import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteProductDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
}

export function DeleteProductDialog({
  open,
  setOpen,
  title,
  description,
  onConfirm,
  loading = false,
  confirmText = "Delete",
  cancelText = "Cancel",
  isDestructive = true,
  secondaryAction,
}: DeleteProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>

          {secondaryAction && (
            <Button
              variant="secondary"
              onClick={() => {
                secondaryAction.onClick();
                setOpen(false);
              }}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {secondaryAction.text}
            </Button>
          )}

          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
            }}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
