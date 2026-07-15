import { backendFetch } from "@/services/httpClient";

/** POST /api/v1/auth/login — { email, password } -> GenericUserResponse + auth cookies. */
export function login({ email, password }) {
  return backendFetch("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}
