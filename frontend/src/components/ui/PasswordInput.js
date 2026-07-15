"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/utils/cn";

/** Input primitive with a show/hide toggle — pair with `Field` like a regular password Input. */
export function PasswordInput({ className, ...props }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink"
        aria-label={isVisible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}
