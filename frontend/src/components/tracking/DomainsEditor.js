"use client";

import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDomainsEditor } from "@/components/tracking/hooks/useDomainsEditor";

/** Editable allowlist of domains the SDK will accept events from for this property. */
export function DomainsEditor({ initialDomains }) {
  const { domains, draft, setDraft, addDomain, removeDomain } =
    useDomainsEditor(initialDomains);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {domains.map((domain) => (
          <Badge key={domain} variant="neutral" className="gap-1.5 pr-1.5">
            {domain}
            <button
              onClick={() => removeDomain(domain)}
              className="rounded-full p-0.5 hover:bg-border"
              aria-label={`Remove ${domain}`}
            >
              <X size={11} />
            </button>
          </Badge>
        ))}
        {domains.length === 0 && (
          <p className="text-sm text-subtle">No domains allowed yet.</p>
        )}
      </div>

      <form onSubmit={addDomain} className="flex gap-2">
        <Input
          placeholder="docs.example.com"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary" size="md">
          Add domain
        </Button>
      </form>
    </div>
  );
}
