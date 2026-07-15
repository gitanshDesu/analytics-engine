"use client";

import { useActionState } from "react";
import { FileText } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { addPageAction } from "@/actions/pages/addPage";
import { PAGE_TYPES, formatPageType } from "@/components/tracking/utils/pageTypes";

const initialState = {};

/**
 * Manual page registry for a tracking property: list + add-page form.
 * TODO(v2): auto-detect pages from incoming PAGE_VIEW events instead of
 * requiring the user to register each pagePath/pageType by hand.
 */
export function PagesEditor({ trackingId, pages }) {
  const [state, formAction, isPending] = useActionState(
    addPageAction,
    initialState
  );

  return (
    <div className="flex flex-col gap-4">
      {pages.length === 0 ? (
        <EmptyState
          icon={<FileText size={18} />}
          title="No pages registered yet"
          description="Add the pages you want categorized in analytics — e.g. /checkout as Checkout."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {pages.map((page) => (
            <li
              key={page.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span className="font-mono text-xs text-ink">{page.pagePath}</span>
              <Badge variant="neutral">{formatPageType(page.pageType)}</Badge>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="trackingId" value={trackingId} />
        <Field label="Path" htmlFor="pagePath" className="flex-1">
          <Input id="pagePath" name="pagePath" placeholder="/checkout" required />
        </Field>
        <Field label="Type" htmlFor="pageType">
          <Select id="pageType" name="pageType" defaultValue="OTHER">
            {PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatPageType(type)}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Adding…" : "Add page"}
        </Button>
      </form>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </div>
  );
}
