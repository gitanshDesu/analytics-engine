import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

/** Styled native <select> — no custom listbox, keeps keyboard/a11y behavior for free. */
export function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-9 text-sm text-ink",
          "outline-none transition-colors focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle"
      />
    </div>
  );
}
