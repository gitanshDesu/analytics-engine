"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { registerAction } from "@/actions/auth/register";

const initialState = { error: null };

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={undefined}
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
        />
        <p className="mt-1 text-xs text-subtle">
          At least 8 characters, with a digit, an uppercase and lowercase
          letter, and a special character.
        </p>
      </Field>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="mt-1">
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
