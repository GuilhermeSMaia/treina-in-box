import { ComponentProps } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<ComponentProps<typeof Input>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  iconClassName?: string;
}

/** Campo de busca com ícone de lupa. */
export function SearchInput({ value, onChange, className, iconClassName, ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <Search
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
          iconClassName
        )}
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className={cn("pl-9", className)} {...props} />
    </div>
  );
}
