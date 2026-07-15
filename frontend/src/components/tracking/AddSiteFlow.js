"use client";

import { useActionState } from "react";
import { AddSiteForm } from "@/components/tracking/AddSiteForm";
import { SnippetStep } from "@/components/tracking/SnippetStep";
import { createTrackingPropertyAction } from "@/actions/tracking/createTrackingProperty";

const initialState = {};

/** Two-step "add a site" wizard: domain form, then the install snippet. */
export function AddSiteFlow() {
  const [state, formAction, isPending] = useActionState(
    createTrackingPropertyAction,
    initialState
  );

  if (state.trackingId) {
    return (
      <SnippetStep
        trackingId={state.trackingId}
        apiBase={state.apiBase}
        sdkUrl={state.sdkUrl}
      />
    );
  }

  return (
    <AddSiteForm formAction={formAction} error={state.error} isPending={isPending} />
  );
}
