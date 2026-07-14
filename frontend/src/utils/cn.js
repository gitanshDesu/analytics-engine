import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges conditional class names and resolves conflicting Tailwind utilities. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
