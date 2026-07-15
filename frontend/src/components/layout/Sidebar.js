"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Share2,
  MousePointerClick,
  Workflow,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { segment: "overview", label: "Overview", icon: LayoutDashboard },
  { segment: "pages", label: "Pages", icon: FileText },
  { segment: "sources", label: "Sources", icon: Share2 },
  { segment: "events", label: "Events", icon: MousePointerClick },
  { segment: "funnel", label: "Funnel", icon: Workflow },
  { segment: "sessions", label: "Sessions", icon: Users },
  { segment: "settings", label: "Settings", icon: Settings },
];

/** Property-scoped nav: Overview / Pages / Sources / Events / Funnel / Sessions / Settings for one trackingId. */
export function Sidebar({ trackingId }) {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border px-3 py-4">
      {NAV_ITEMS.map(({ segment, label, icon: Icon }) => {
        const href = `/${trackingId}/${segment}`;
        const isActive = pathname?.startsWith(href);

        return (
          <Link
            key={segment}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-surface-hover text-ink"
                : "text-muted hover:bg-surface-hover hover:text-ink"
            )}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
