import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export interface ErrorDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  description: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  tertiaryAction?: {
    label: string;
    onClick: () => void;
    isDestructive?: boolean;
  };
}

export function ErrorDialog({
  open,
  setOpen,
  title,
  description,
  secondaryAction,
  tertiaryAction,
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
          {secondaryAction && (
            <Button
              onClick={() => {
                secondaryAction.onClick();
                setOpen(false);
              }}
              className="w-full sm:w-auto"
            >
              {secondaryAction.label}
            </Button>
          )}
          {tertiaryAction && (
            <Button
              variant={tertiaryAction.isDestructive ? "destructive" : "default"}
              onClick={() => {
                tertiaryAction.onClick();
                setOpen(false);
              }}
              className="w-full sm:w-auto"
            >
              {tertiaryAction.label}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
