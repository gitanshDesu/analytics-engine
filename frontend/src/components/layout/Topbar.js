import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PropertySwitcher } from "@/components/layout/PropertySwitcher";
import { UserMenu } from "@/components/layout/UserMenu";

/**
 * App-wide header: logo, property switcher (when a site is in scope), user menu.
 * `properties` is omitted on screens with no site context (e.g. /sites).
 */
export function Topbar({ properties, email }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
      <div className="flex items-center gap-4">
        <Link href="/sites" className="flex items-center gap-2 text-ink">
          <BarChart3 size={18} className="text-accent" />
          <span className="text-sm font-semibold">Analytics Engine</span>
        </Link>
        {properties && <PropertySwitcher properties={properties} />}
      </div>
      <UserMenu email={email} />
    </header>
  );
}
