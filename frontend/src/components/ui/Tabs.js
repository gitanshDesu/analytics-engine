"use client";

import { useId, useState } from "react";
import { cn } from "@/utils/cn";

/**
 * Minimal controlled/uncontrolled tabs primitive.
 * `items`: [{ value, label, content }]
 */
export function Tabs({ items, defaultValue, className }) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);
  const baseId = useId();
  const activeItem = items.find((item) => item.value === active);

  return (
    <div className={className}>
      <div
        role="tablist"
        className="flex items-center gap-1 border-b border-border px-2"
      >
        {items.map((item) => {
          const isActive = item.value === active;
          return (
            <button
              key={item.value}
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.value}`}
              onClick={() => setActive(item.value)}
              className={cn(
                "relative px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-ink" : "text-muted hover:text-ink"
              )}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-tab-${active}`}
      >
        {activeItem?.content}
      </div>
    </div>
  );
}
