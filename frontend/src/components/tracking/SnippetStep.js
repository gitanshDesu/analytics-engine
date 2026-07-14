import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SnippetBlock } from "@/components/tracking/SnippetBlock";

/** Step 2 of the add-site flow: install snippet + a placeholder "waiting for data" state. */
export function SnippetStep({ trackingId }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink">
          Paste this snippet into your site&apos;s <code className="font-mono text-xs">&lt;head&gt;</code>.
        </p>
        <p className="text-sm text-muted">
          Tracking ID: <span className="font-mono text-ink">{trackingId}</span>
        </p>
      </div>

      <SnippetBlock trackingId={trackingId} />

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-hover px-3 py-2.5 text-sm text-muted">
        <Loader2 size={14} className="animate-spin text-subtle" />
        Waiting for your first pageview — visit your site to confirm it&apos;s wired up.
      </div>

      <Button href={`/${trackingId}/overview`} variant="secondary">
        Go to dashboard
      </Button>
    </div>
  );
}
