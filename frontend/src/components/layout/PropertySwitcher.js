"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Check, Plus, Globe } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { getPropertyLabel } from "@/components/tracking/utils/getPropertyLabel";
import { cn } from "@/utils/cn";

/**
 * Dropdown for switching between the user's tracking properties ("sites").
 * `properties`: TrackingProperty[] ({ trackingId, domains, ... }).
 *
 * The active property is read from the URL (first path segment) rather than
 * passed as a prop — Topbar renders from `(dashboard)/layout.js`, which sits
 * above the `[trackingId]` segment and can never receive that param itself.
 */
export function PropertySwitcher({ properties }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useClickOutside(() => setIsOpen(false));
  const pathname = usePathname();
  const activeTrackingId = pathname?.split("/")[1];
  const active = properties.find((p) => p.trackingId === activeTrackingId);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover"
      >
        <Globe size={14} className="text-subtle" />
        <span className="font-medium text-ink">
          {active ? getPropertyLabel(active).primary : "Select a site"}
        </span>
        <ChevronsUpDown size={14} className="text-subtle" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-lg border border-border bg-surface py-1 shadow-(--shadow-card)">
          {properties.map((property) => {
            const isActive = property.trackingId === activeTrackingId;
            const { primary, secondary } = getPropertyLabel(property);
            return (
              <Link
                key={property.trackingId}
                href={`/${property.trackingId}/overview`}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface-hover",
                  isActive ? "text-ink" : "text-muted"
                )}
              >
                <span className="flex flex-col">
                  <span className="font-medium">{primary}</span>
                  <span className="text-xs text-subtle">
                    {secondary ?? property.trackingId}
                  </span>
                </span>
                {isActive && <Check size={14} className="text-accent" />}
              </Link>
            );
          })}
          <div className="my-1 border-t border-border" />
          <Link
            href="/sites/new"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-ink"
          >
            <Plus size={14} />
            Add site
          </Link>
        </div>
      )}
    </div>
  );
}
