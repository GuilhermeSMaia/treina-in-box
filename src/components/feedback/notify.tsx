import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

/** Avisos padronizados de sucesso, exclusão e erro (toasts). */
export const notify = {
  success: (title: string, description?: string) =>
    toast.success(title, {
      description,
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    }),
  deleted: (title: string, description?: string) =>
    toast(title, {
      description,
      icon: <Trash2 className="h-4 w-4 text-destructive" />,
    }),
  error: (title: string, description?: string) =>
    toast.error(title, {
      description,
      icon: <XCircle className="h-4 w-4 text-destructive" />,
    }),
};
