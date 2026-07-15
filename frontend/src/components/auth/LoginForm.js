"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { loginAction } from "@/actions/auth/login";

const initialState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="mt-1">
        {isPending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
