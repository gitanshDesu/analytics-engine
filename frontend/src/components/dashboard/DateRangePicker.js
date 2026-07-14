"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/utils/cn";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

// Phase 2: only updates the URL. Phase 3 wires the overview page's data
// fetching to read this `range` search param server-side.
export function DateRangePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useClickOutside(() => setIsOpen(false));
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRange = searchParams.get("range") ?? "30d";

  function selectRange(value) {
    const params = new URLSearchParams(searchParams);
    params.set("range", value);
    router.replace(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  }

  const activeLabel = PRESETS.find((p) => p.value === activeRange)?.label;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink hover:bg-surface-hover"
      >
        <Calendar size={14} className="text-subtle" />
        {activeLabel}
        <ChevronDown size={14} className="text-subtle" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-44 rounded-lg border border-border bg-surface py-1 shadow-(--shadow-card)">
          {PRESETS.map((preset) => {
            const isActive = preset.value === activeRange;
            return (
              <button
                key={preset.value}
                onClick={() => selectRange(preset.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover",
                  isActive ? "text-ink" : "text-muted"
                )}
              >
                {preset.label}
                {isActive && <Check size={14} className="text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
