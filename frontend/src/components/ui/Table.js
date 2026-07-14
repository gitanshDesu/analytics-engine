import { cn } from "@/utils/cn";

export function Table({ className, ...props }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }) {
  return (
    <thead
      className={cn("text-xs text-subtle", className)}
      {...props}
    />
  );
}

export function TableHeaderCell({ className, ...props }) {
  return (
    <th
      className={cn(
        "px-5 py-2 text-left font-medium",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn("transition-colors hover:bg-surface-hover", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td className={cn("px-5 py-2.5 text-ink", className)} {...props} />
  );
}
