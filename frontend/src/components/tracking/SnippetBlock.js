"use client";

import { Copy, Check } from "lucide-react";
import { useClipboard } from "@/hooks/useClipboard";
import { buildSnippet } from "@/components/tracking/utils/buildSnippet";

/**
 * Copyable install snippet for a tracking property, shared by onboarding and
 * Settings. `apiBase`/`sdkUrl` must be threaded in as props from server-side
 * code (BACKEND_API_BASE_URL/SDK_SCRIPT_URL aren't NEXT_PUBLIC_ vars, so this
 * client component can't read them from process.env itself).
 */
export function SnippetBlock({ trackingId, apiBase, sdkUrl }) {
  const { isCopied, copy } = useClipboard();
  const snippet = buildSnippet(trackingId, apiBase, sdkUrl);

  return (
    <div className="relative rounded-lg border border-border bg-bg">
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-ink">
        <code>{snippet}</code>
      </pre>
      <button
        onClick={() => copy(snippet)}
        className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-ink"
      >
        {isCopied ? <Check size={12} /> : <Copy size={12} />}
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
