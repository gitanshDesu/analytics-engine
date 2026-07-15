"use server";

import { cookies } from "next/headers";
import { createTrackingProperty } from "@/services/tracking/createTrackingProperty";
import { ApiError } from "@/services/httpClient";

/**
 * Server Action behind AddSiteForm. Doesn't redirect — AddSiteFlow needs the
 * created trackingId in hand to render the snippet step on the same page.
 */
export async function createTrackingPropertyAction(prevState, formData) {
  const domain = formData.get("domain")?.toString().trim();

  if (!domain) {
    return { error: "Enter the domain you want to track." };
  }

  try {
    const accessToken = (await cookies()).get("accessToken")?.value;
    const { data } = await createTrackingProperty(
      { domains: [domain] },
      { accessToken }
    );
    return {
      trackingId: data.trackingId,
      domain,
      apiBase: process.env.BACKEND_API_BASE_URL,
      sdkUrl: process.env.SDK_SCRIPT_URL,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.errors?.[0] ?? error.message };
    }
    throw error;
  }
}
