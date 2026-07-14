"use client";

import { useState } from "react";

/** Copies text to the clipboard and exposes a transient "copied" flag for UI feedback. */
export function useClipboard(resetAfterMs = 1500) {
  const [isCopied, setIsCopied] = useState(false);

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), resetAfterMs);
    } catch {
      // clipboard permission denied/unavailable — fail silently, button just won't flip to "Copied"
    }
  }

  return { isCopied, copy };
}
