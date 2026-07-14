import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

/** Shared centered-card frame for the login/register screens. */
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center justify-center gap-2 text-ink">
          <BarChart3 size={20} className="text-accent" />
          <span className="text-sm font-semibold">Analytics Engine</span>
        </Link>

        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="text-lg font-semibold text-ink">{title}</h1>
              <p className="text-sm text-muted">{subtitle}</p>
            </div>
            {children}
          </CardContent>
        </Card>

        {footer && <p className="text-center text-sm text-muted">{footer}</p>}
      </div>
    </div>
  );
}
