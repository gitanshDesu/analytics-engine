"use client";

import { AddSiteForm } from "@/components/tracking/AddSiteForm";
import { SnippetStep } from "@/components/tracking/SnippetStep";
import { useAddSiteFlow } from "@/components/tracking/hooks/useAddSiteFlow";

/** Two-step "add a site" wizard: domain form, then the install snippet. */
export function AddSiteFlow() {
  const { step, trackingId, isSubmitting, error, createSite } =
    useAddSiteFlow();

  if (step === "snippet") {
    return <SnippetStep trackingId={trackingId} />;
  }

  return (
    <AddSiteForm
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={createSite}
    />
  );
}
