"use client";

import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Step 1 of the add-site flow: collect the domain to track. */
export function AddSiteForm({ formAction, error, isPending }) {
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Domain" htmlFor="domain" error={error}>
        <Input id="domain" name="domain" placeholder="example.com" required />
      </Field>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create site"}
      </Button>
    </form>
  );
}
