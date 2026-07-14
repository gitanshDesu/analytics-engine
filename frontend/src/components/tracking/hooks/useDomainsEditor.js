"use client";

import { useState } from "react";

// TODO(Phase 3): persist via actions/tracking instead of local state only.
export function useDomainsEditor(initialDomains) {
  const [domains, setDomains] = useState(initialDomains);
  const [draft, setDraft] = useState("");

  function addDomain(event) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || domains.includes(trimmed)) return;
    setDomains((prev) => [...prev, trimmed]);
    setDraft("");
  }

  function removeDomain(domain) {
    setDomains((prev) => prev.filter((d) => d !== domain));
  }

  return { domains, draft, setDraft, addDomain, removeDomain };
}
