"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout } from "@/services/auth/logout";
import { relayAuthCookies } from "@/services/auth/cookieRelay";

/** Server Action behind the UserMenu's "Log out" button. */
export async function logoutAction() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  try {
    const { setCookieHeaders } = await logout({ accessToken, refreshToken });
    relayAuthCookies(setCookieHeaders, cookieStore);
  } catch {
    // Even if the backend call fails (already-expired token, etc.), still
    // clear the local cookies so the user isn't stuck "logged in" client-side.
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
  }

  redirect("/login");
}
