"use client";

import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthForm } from "@/components/auth/hooks/useAuthForm";

// TODO(Phase 3): replace with a call into actions/auth (POST /api/v1/auth/login via proxy).
async function mockLogin(values) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (!values.email || !values.password) {
    throw new Error("Enter your email and password.");
  }
}

export function LoginForm() {
  const router = useRouter();
  const { values, setValue, isSubmitting, error, handleSubmit } = useAuthForm(
    { email: "", password: "" },
    async (formValues) => {
      await mockLogin(formValues);
      router.push("/sites");
    }
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValue("email", e.target.value)}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => setValue("password", e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="mt-1">
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
