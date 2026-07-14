"use client";

import { useEffect, useRef } from "react";

/** Calls `onOutsideClick` when a pointer event lands outside the returned ref's element. */
export function useClickOutside(onOutsideClick) {
  const ref = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onOutsideClick(event);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onOutsideClick]);

  return ref;
}
