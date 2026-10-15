import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/settings/TablePagination";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  header: ReactNode;
  cell: (item: T) => ReactNode;
  /** Classes do cabeçalho e das células (ex.: alinhamento). */
  className?: string;
  /** Classes só das células (ex.: fonte, cor). */
  cellClassName?: string;
}

interface DataTableCardProps<T> {
  title: ReactNode;
  description?: ReactNode;
  /** Conteúdo à direita do título (ex.: botão "Novo"). */
  headerAction?: ReactNode;
  /** Busca, filtros ou formulário exibidos acima da tabela. */
  toolbar?: ReactNode;
  items: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (item: T) => string;
  isLoading?: boolean;
  emptyMessage: string;
}

/** Card de Configurações com tabela paginada, carregamento e mensagem de vazio. */
export function DataTableCard<T>({
  title,
  description,
  headerAction,
  toolbar,
  items,
  columns,
  getRowKey,
  isLoading = false,
  emptyMessage,
}: DataTableCardProps<T>) {
  const pagination = useTablePagination(items);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {headerAction}
      </CardHeader>
      <CardContent className="space-y-4">
        {toolbar}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div>
            <div className="-mx-6 overflow-x-auto px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col, i) => (
                      <TableHead key={i} className={col.className}>
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map((item) => (
                    <TableRow key={getRowKey(item)}>
                      {columns.map((col, i) => (
                        <TableCell key={i} className={cn(col.className, col.cellClassName)}>
                          {col.cell(item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination pagination={pagination} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
