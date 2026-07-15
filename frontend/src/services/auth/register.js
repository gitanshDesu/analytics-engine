import { backendFetch } from "@/services/httpClient";

/** POST /api/v1/auth/register — { email, password, fullName } -> GenericUserResponse + auth cookies. */
export function register({ email, password, fullName }) {
  return backendFetch("/api/v1/auth/register", {
    method: "POST",
    body: { email, password, fullName },
  });
}
