import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/user/{id} -> GenericUserResponse. Backend 403s unless id === the authenticated user. */
export function getUser(id, { accessToken }) {
  return backendFetch(`/api/v1/user/${id}`, { accessToken });
}
