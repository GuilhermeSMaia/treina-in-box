import { ReactNode } from "react";
import { Loader2, LucideIcon, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  isPending?: boolean;
  /** Classes extras do conteúdo e da descrição (ex.: tema escuro do lobby). */
  className?: string;
  descriptionClassName?: string;
  cancelClassName?: string;
}

/** Confirmação padrão antes de excluir (ou cancelar) algo. */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirmar exclusão",
  description = "Este item será removido permanentemente. Esta ação não pode ser desfeita.",
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  icon: Icon = Trash2,
  isPending = false,
  className,
  descriptionClassName,
  cancelClassName,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("sm:max-w-md", className)}>
        <AlertDialogHeader className="sm:flex-row sm:items-start sm:gap-4 sm:text-left">
          <div className="mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 sm:mx-0">
            <Icon className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-2">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className={descriptionClassName}>{description}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} className={cancelClassName}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Mantém o diálogo aberto até a ação terminar
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
