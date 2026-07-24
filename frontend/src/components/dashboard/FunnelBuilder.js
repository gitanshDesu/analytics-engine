"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

const EVENT_TYPES = [
  { value: "PAGE_VIEW", label: "Page view" },
  { value: "BUTTON_CLICK", label: "Button click" },
  { value: "LINK_CLICK", label: "Link click" },
  { value: "ELEMENT_CLICK", label: "Element click" },
  { value: "FORM_SUBMIT", label: "Form submit" },
  { value: "SCROLL", label: "Scroll" },
];

const MIN_STEPS = 2;
const MAX_STEPS = 6;

function encodeSteps(steps) {
  return steps.map((step) => (step.text ? `${step.eventType}:${step.text}` : step.eventType));
}

/** Editable ordered list of funnel steps — "Run funnel" pushes them into the URL as
 * repeated `steps` params, which the server component reads to refetch. */
export function FunnelBuilder({ initialSteps }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [steps, setSteps] = useState(initialSteps);

  const updateStep = (index, patch) =>
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)));

  const addStep = () =>
    setSteps((prev) => [...prev, { eventType: "BUTTON_CLICK", text: "" }]);

  const removeStep = (index) =>
    setSteps((prev) => prev.filter((_, i) => i !== index));

  const runFunnel = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("steps");
    for (const encoded of encodeSteps(steps)) params.append("steps", encoded);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-xs font-medium text-subtle">
            {index + 1}
          </span>
          <div className="w-40 shrink-0">
            <Select
              value={step.eventType}
              onChange={(e) => updateStep(index, { eventType: e.target.value })}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
          <Input
            placeholder="Contains text (optional) — e.g. Book Now"
            value={step.text}
            onChange={(e) => updateStep(index, { text: e.target.value })}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => removeStep(index)}
            disabled={steps.length <= MIN_STEPS}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            aria-label="Remove step"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addStep}
          disabled={steps.length >= MAX_STEPS}
        >
          <Plus size={14} />
          Add step
        </Button>
        <Button type="button" size="sm" onClick={runFunnel}>
          Run funnel
        </Button>
      </div>
    </div>
  );
}
