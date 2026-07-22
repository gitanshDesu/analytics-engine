# Module 16 — Tying It Back to This Repo

Read last, deliberately — reading this first would let pattern-matching against real code substitute
for actually understanding the modules above. Everything below maps a concept from Modules 1–9 onto
`analytics-backend`'s real auth implementation, and names what was simplified and why.

## The files, and which module each maps to

| File | Maps to |
|---|---|
| `config/SecurityConfig.java` | Module 6 (filter chain), Module 8 (route matchers, CORS) |
| `filter/JwtAuthFilter.java` | Module 6, section 5 (the auth filter) |
| `service/TokenService.java` | Module 4 (JWT), Module 5 (refresh token generation/hashing) |
| `service/AuthService.java` | Module 5 (persistence + rotation), Module 7 (endpoint logic) |
| `controller/AuthController.java` | Module 7, section 1 |
| `model/User.java` | Module 5, section 4 — but simplified (see below) |

## What matches the tutorial exactly

- **Stateless JWT access token, `HS256`, `TokenService.generateAccessToken()`** — single backend
  service both issues and verifies its own tokens, so symmetric signing (Module 4, section 5) is the
  right, simpler choice; there's no second service that needs to verify without holding the secret.
- **Password hashing via BCrypt** (`PasswordUtil`, used in `AuthService`) — matches Module 1 exactly:
  slow, tunable, purpose-built for a low-entropy, guessable secret.
- **Opaque refresh token, not a JWT** — `TokenService.generateRefreshToken()` returns a random UUID,
  matching Module 5, section 3's reasoning: the refresh token is the one piece that needs a forced
  server-side lookup to be revocable.
- **Refresh token hashed at rest, never stored raw** — `hashRefreshToken()` / `verifyRefreshToken()` in
  `TokenService`, `AuthService.issueTokens()`. One deliberate deviation from Module 5, section 5's
  suggestion: this repo hashes the refresh token with **BCrypt**, not a fast hash like SHA-256. Given
  the token is high-entropy and random, SHA-256 would have been sufficient and cheaper — BCrypt here
  isn't wrong (it still works, just does more work than the threat model strictly requires), but it's
  a good live example of the module's point: match the hash to what's actually guessable, and this is
  a case where the code is slightly more conservative than necessary rather than under-protected.
- **`HttpOnly` + `Secure` cookies, `Path`-scoped** — `AuthService.setTokenCookie()` sets both flags,
  and critically, scopes the refresh cookie to `Path=/analytics-backend/api/v1/auth` while the access
  token cookie uses `Path=/` — exactly Module 3 and Module 7 section 4's blast-radius-reduction
  pattern: the more sensitive, longer-lived token is never even sent on unrelated requests.
- **The two-stage filter/authorize design** — `JwtAuthFilter` never rejects a request itself; it only
  populates `SecurityContextHolder` if a valid token is present (Module 6, section 5's exact
  reasoning), and `SecurityConfig`'s `authorizeHttpRequests()` is what actually enforces access.
- **Stateless session policy** — `SessionCreationPolicy.STATELESS` in `SecurityConfig`, matching
  Module 2's stateless-JWT-for-most-requests half of the hybrid model.
- **Refresh token reuse detection** — `AuthService.refresh()`: on a hash mismatch, it clears
  `user.setRefreshToken(null)`, invalidating the session rather than quietly rejecting one request —
  Module 5, section 6's exact behavior.

## What was deliberately simplified, and why that's a reasonable MVP tradeoff

**Single refresh token per `User`, not a `refresh_tokens`/sessions table.** `User.refreshToken` is one
field, overwritten on every login/refresh (`AuthService.issueTokens()`: `user.setRefreshToken(hash)`).
This is Module 5, section 4's pattern *without* the per-device table from section 7 — it gives full,
correct revocation (logout, reuse detection both work) but **not** the "log out of just this device"
or "list my active sessions" capabilities, because there's only ever one live session record per user,
full stop. For a project at this stage — one analytics dashboard user, one login session, no
multi-device requirement yet — this is a legitimate simplification, not an oversight: it's strictly
less code and less state to reason about, and it doesn't compromise the security properties that
matter today (a stolen token is still detectable and revocable). It becomes a real gap the moment
multi-device or "manage your sessions" becomes a product requirement — at which point Module 5,
section 7 and Module 12's stretch goal A describe exactly the change needed: move `refreshToken` off
`User` and into its own collection, one row per issued token.

**No RBAC at all.** There is no `role` field anywhere on `User`, and no `@PreAuthorize`/`hasRole`
usage in the codebase — every authenticated user (`anyRequest().authenticated()` in `SecurityConfig`)
has identical access to every management endpoint (`DashboardController`, `SessionController`,
`UserController`, etc.). This matches "one kind of user, no admin/staff distinction yet" — genuinely
fine for a single-tenant-per-account analytics tool where a logged-in user only ever manages *their
own* tracking properties. It stops being fine the moment there's a reason to distinguish "a regular
account" from "an internal/admin account" that can see across tenants — Module 9's exact pattern
(a `role` claim on the JWT, a `ROLE_`-prefixed authority, `hasRole("ADMIN")` on the routes that need
it) is the direct next step, with no structural rework needed first.

**Two different CORS postures, and why that split is correct, not inconsistent.** `SecurityConfig`'s
`corsConfigurationSource()` allows `"*"` origins with `allowCredentials(false)`, but scopes that
wide-open policy to exactly `/api/v1/session/**` and `/api/v1/event/**` — the SDK ingestion endpoints,
hit directly by visitor browsers on arbitrary customer websites, which by design have no fixed,
enumerable set of origins and never carry the auth cookie (`allowCredentials(false)` — no cookie can
be sent cross-origin under this config regardless). The `/api/v1/auth/**` routes are **not** covered
by this wide-open CORS config at all — they're same-site with the frontend in this deployment, so
Module 6's "explicit origins required when `allowCredentials(true)`" rule was never actually tested
against a cross-origin auth flow here. If the frontend and backend ever move to different origins,
this is exactly the point where `SecurityConfig` would need its own dedicated, explicit-origin,
`allowCredentials(true)` CORS registration for the auth routes specifically — reusing the SDK
endpoints' wildcard config for auth would be the mistake Module 6 warns against.

**`csrf().disable()`** — present in `SecurityConfig`, and the justification is the same as Module 6's:
stateless API, every mutating request also carries a JWT the server independently verifies, so a
forged cross-site form submission can attach the cookie but can't produce a token that passes
`JwtAuthFilter`. Worth periodically re-checking (Module 6's checkpoint question 4) as new endpoints
are added — any future endpoint that trusts the cookie's mere presence without validating the token
inside it would quietly break this reasoning.

## What to actually do with this

Two concrete, scoped exercises against the real code, using exactly what this tutorial built:

1. **Apply Module 9's RBAC** to distinguish a regular analytics user from an admin/internal user —
   add `Role` to `User`, embed it as a JWT claim in `TokenService`, read it in `JwtAuthFilter`, and
   gate one real endpoint (pick something in `DashboardController` or add a new internal-only route).
2. **Apply Module 5/12's per-device session model** — replace `User.refreshToken` with a
   `refresh_tokens` collection, update `AuthService.issueTokens()`/`refresh()`/`logout()` accordingly,
   and add a "list my sessions" / "revoke one session" endpoint pair.

Both are self-contained enough to do without touching unrelated parts of the codebase, and both are
exactly the two simplifications named above — not hypothetical exercises, but the real, current gaps.
