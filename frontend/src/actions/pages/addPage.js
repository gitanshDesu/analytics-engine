"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { addPage } from "@/services/pages/addPage";
import { ApiError } from "@/services/httpClient";

/** Server Action behind the "tracked pages" form on the Settings screen. */
export async function addPageAction(prevState, formData) {
  const trackingId = formData.get("trackingId")?.toString();
  const pagePath = formData.get("pagePath")?.toString().trim();
  const pageType = formData.get("pageType")?.toString();

  if (!trackingId || !pagePath || !pageType) {
    return { error: "Enter a path and choose a page type." };
  }

  try {
    const accessToken = (await cookies()).get("accessToken")?.value;
    await addPage({ trackingId, pagePath, pageType }, { accessToken });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.errors?.[0] ?? error.message };
    }
    throw error;
  }

  revalidatePath(`/${trackingId}/settings`);
  return { success: true };
}
