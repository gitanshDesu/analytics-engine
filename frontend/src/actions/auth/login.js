"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { login } from "@/services/auth/login";
import { relayAuthCookies } from "@/services/auth/cookieRelay";
import { ApiError } from "@/services/httpClient";

/** Server Action behind LoginForm. */
export async function loginAction(prevState, formData) {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  try {
    const { setCookieHeaders } = await login({ email, password });
    relayAuthCookies(setCookieHeaders, await cookies());
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.errors?.[0] ?? error.message };
    }
    throw error;
  }

  redirect("/sites");
}
