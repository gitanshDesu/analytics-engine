"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { register } from "@/services/auth/register";
import { relayAuthCookies } from "@/services/auth/cookieRelay";
import { ApiError } from "@/services/httpClient";

/** Server Action behind RegisterForm — calls services/auth directly (already server-side, no need for the /api hop). */
export async function registerAction(prevState, formData) {
  const fullName = formData.get("fullName")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString() ?? "";

  if (!fullName || !email || !password) {
    return { error: "Fill in every field to continue." };
  }

  try {
    const { setCookieHeaders } = await register({ email, password, fullName });
    relayAuthCookies(setCookieHeaders, await cookies());
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`[registerAction] ApiError ${error.status}: ${error.message}`, error.errors ?? "");
      return { error: error.errors?.[0] ?? error.message };
    }
    console.error("[registerAction] Unexpected error:", error);
    throw error;
  }

  redirect("/sites");
}
