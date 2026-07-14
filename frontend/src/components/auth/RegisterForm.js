"use client";

import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthForm } from "@/components/auth/hooks/useAuthForm";

// TODO(Phase 3): replace with a call into actions/auth (POST /api/v1/auth/register via proxy).
async function mockRegister(values) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (!values.fullName || !values.email || !values.password) {
    throw new Error("Fill in every field to continue.");
  }
  if (values.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
}

export function RegisterForm() {
  const router = useRouter();
  const { values, setValue, isSubmitting, error, handleSubmit } = useAuthForm(
    { fullName: "", email: "", password: "" },
    async (formValues) => {
      await mockRegister(formValues);
      router.push("/sites/new");
    }
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Full name" htmlFor="fullName">
        <Input
          id="fullName"
          autoComplete="name"
          value={values.fullName}
          onChange={(e) => setValue("fullName", e.target.value)}
        />
      </Field>
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
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => setValue("password", e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="mt-1">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
