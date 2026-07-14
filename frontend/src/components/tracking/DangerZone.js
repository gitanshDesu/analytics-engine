"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// TODO(Phase 3): no DELETE /api/v1/tracking/{trackingId} exists on the
// backend yet — wire this once that endpoint ships.
export function DangerZone({ siteName }) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (isConfirming) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm text-ink">
          Delete <span className="font-medium">{siteName}</span> and all of its
          collected analytics? This can&apos;t be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" onClick={() => setIsConfirming(false)}>
            Yes, delete this site
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted">
        Permanently delete this site and all of its data.
      </p>
      <Button variant="danger" size="sm" onClick={() => setIsConfirming(true)}>
        Delete site
      </Button>
    </div>
  );
}
