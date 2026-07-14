"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Step 1 of the add-site flow: collect the domain to track. */
export function AddSiteForm({ isSubmitting, error, onSubmit }) {
  const [domain, setDomain] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(domain.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="Domain"
        htmlFor="domain"
        error={error}
      >
        <Input
          id="domain"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Create site"}
      </Button>
    </form>
  );
}
