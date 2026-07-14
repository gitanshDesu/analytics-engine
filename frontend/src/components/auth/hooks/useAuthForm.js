"use client";

import { useState } from "react";

/**
 * Shared controlled-form state for LoginForm/RegisterForm.
 * `onSubmit` is supplied by the page and does the actual work — in Phase 2
 * that's a mock delay, in Phase 3 it becomes a call into `actions/auth`.
 */
export function useAuthForm(initialValues, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function setValue(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(submitError.message ?? "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, setValue, isSubmitting, error, handleSubmit };
}
