import { cn } from "@/utils/cn";

/** Bare input primitive. Pair with `Field` for the label/error wrapper. */
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink placeholder:text-subtle",
        "outline-none transition-colors focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

/** Label + input/children + optional error message, spaced consistently. */
export function Field({ label, htmlFor, error, children, className }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
