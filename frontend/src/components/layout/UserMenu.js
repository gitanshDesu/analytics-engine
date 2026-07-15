"use client";

import { useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { logoutAction } from "@/actions/auth/logout";

/** Avatar dropdown with account email + a logout entry point. */
export function UserMenu({ email }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useClickOutside(() => setIsOpen(false));
  const initial = email?.[0]?.toUpperCase() ?? "?";

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent hover:bg-accent/25"
      >
        {initial}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-lg border border-border bg-surface py-1 shadow-(--shadow-card)">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted">
            <UserIcon size={14} />
            <span className="truncate">{email}</span>
          </div>
          <div className="my-1 border-t border-border" />
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10">
              <LogOut size={14} />
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
