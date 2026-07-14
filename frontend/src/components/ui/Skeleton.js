import { cn } from "@/utils/cn";

/** Pulsing placeholder block for loading states — sized via className. */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-hover",
        className
      )}
      {...props}
    />
  );
}
