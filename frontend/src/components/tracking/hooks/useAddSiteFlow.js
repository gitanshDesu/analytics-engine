"use client";

import { useState } from "react";

function generateMockTrackingId() {
  return `TP-${Math.random().toString(16).slice(2, 8)}`;
}

// TODO(Phase 3): swap generateMockTrackingId + this in-memory step for a real
// call into actions/tracking (POST /api/v1/tracking via proxy), returning
// the persisted TrackingProperty.
export function useAddSiteFlow() {
  const [step, setStep] = useState("form");
  const [domain, setDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [trackingId, setTrackingId] = useState(null);

  async function createSite(submittedDomain) {
    setError(null);
    if (!submittedDomain) {
      setError("Enter the domain you want to track.");
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setTrackingId(generateMockTrackingId());
      setDomain(submittedDomain);
      setStep("snippet");
    } finally {
      setIsSubmitting(false);
    }
  }

  return { step, domain, trackingId, isSubmitting, error, createSite };
}
