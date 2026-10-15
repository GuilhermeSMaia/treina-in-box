import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { useTablePagination } from "@/hooks/useTablePagination";

type Pagination = Pick<
  ReturnType<typeof useTablePagination>,
  "currentPage" | "totalPages" | "totalItems" | "hasNextPage" | "hasPrevPage" | "nextPage" | "prevPage" | "goToPage"
>;

export function TablePagination({ pagination }: { pagination: Pagination }) {
  const { currentPage, totalPages, totalItems, hasNextPage, hasPrevPage, nextPage, prevPage, goToPage } = pagination;
  if (totalPages <= 1) return null;

  const buttons = [
    { icon: ChevronsLeft, onClick: () => goToPage(1), disabled: !hasPrevPage, label: "Primeira página" },
    { icon: ChevronLeft, onClick: prevPage, disabled: !hasPrevPage, label: "Página anterior" },
    { icon: ChevronRight, onClick: nextPage, disabled: !hasNextPage, label: "Próxima página" },
    { icon: ChevronsRight, onClick: () => goToPage(totalPages), disabled: !hasNextPage, label: "Última página" },
  ];

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-muted-foreground">
        {totalItems} registro{totalItems !== 1 ? "s" : ""} · Página {currentPage} de {totalPages}
      </p>
      <div className="flex items-center gap-1">
        {buttons.map(({ icon: Icon, onClick, disabled, label }) => (
          <Button
            key={label}
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
    </div>
  );
}
