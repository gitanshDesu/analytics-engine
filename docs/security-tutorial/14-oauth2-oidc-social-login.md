# Module 14 — OAuth2 / OpenID Connect: Social Login and Delegated Auth

Everything through Module 13 assumed *your* server issues and verifies its own credentials — you own
the password hash, you own the JWT signing key. "Sign in with Google" (or GitHub, or any
"continue with X" button) is a fundamentally different arrangement: another party vouches for the
user's identity, and your server never sees a password at all. This module explains the shape of that
arrangement — enough to integrate it correctly and know what each piece is for — not a full OAuth2
client implementation.

## Quick reference: What / Why / How / When

| Concept | What | Why | How | When |
|---|---|---|---|---|
| **OAuth2** | A delegated-**authorization** protocol | Lets your app act on a user's behalf at another service, without ever seeing their password there | Authorization code exchanged for an access token via the provider | Third-party API access (e.g. "read this user's Google Calendar") |
| **OpenID Connect (OIDC)** | An **authentication** layer built on top of OAuth2 | OAuth2 alone doesn't standardize "who is this user," OIDC does | Adds a signed **ID token** (a JWT, Module 4) alongside the access token | "Sign in with X" — you want identity, not necessarily API access |
| **Authorization Code flow + PKCE** | The standard flow for browser/mobile apps | Avoids ever exposing tokens directly to the browser's JS or a public client's embedded secret | A redirect dance through the provider, a one-time code exchanged server-side (or with a PKCE verifier) for tokens | Any app with a frontend that isn't a fully trusted backend |

## 1. OAuth2 vs OIDC — a distinction worth being precise about

**OAuth2** was designed to solve **delegated authorization**: "let this app read my Google Calendar
without giving it my Google password." The output of a successful OAuth2 flow is an **access token**
scoped to *that provider's own APIs* — it says nothing standardized about who the user is, only what
the token-holder is allowed to do at the provider.

**OpenID Connect** is a thin, standardized layer on top of OAuth2 specifically for **authentication**:
"tell me who this user is." It adds a well-defined **ID token** — a JWT, signed by the provider,
containing standardized identity claims (`sub`, `email`, `name`, ...) — issued alongside the OAuth2
access token. When people say "OAuth2 login" colloquially, they almost always mean OIDC riding on top
of OAuth2's mechanics, using the ID token for identity rather than the access token for API access.

**Why the distinction matters in practice:** a common, real mistake is using the OAuth2 **access
token** as if it were proof of identity — treating "the client possesses a valid access token" as
"the client is this specific user." The access token was never meant to assert identity; the **ID
token** is the piece that does, and it's the one you should verify (signature, `aud`, `exp` — same
checks as any JWT, Module 4) and read claims from when the goal is "who is this."

## 2. The Authorization Code flow, step by step

This is the flow a normal web app uses (as opposed to flows meant for server-to-server or legacy
scenarios, out of scope here):

1. Your app redirects the browser to the provider's authorization endpoint, with your app's client id,
   requested scopes, a redirect URI, and (for PKCE, see below) a code challenge.
2. The user authenticates **at the provider**, not at your app — your app never sees their Google
   password, ever.
3. The provider redirects back to your app's redirect URI with a short-lived, single-use
   **authorization code** in the query string.
4. Your app's **backend** exchanges that code — along with your client secret (confidential clients)
   or the PKCE verifier (public clients, see below) — directly with the provider's token endpoint,
   server-to-server, for the actual access token and ID token.
5. Your app now has a verified ID token — extract the user's identity claims, and either log them into
   an existing account (matched by email/provider-specific id) or create one.

**Why the code is exchanged server-to-server in step 4, not just handed back directly in step 3:** the
redirect in step 3 goes through the browser's address bar/history — anything placed there directly
(rather than a one-time code that still requires a second, secret-backed exchange) would be exposed to
anything with access to browser history, referrer headers, or a shoulder-surfed URL.

## 3. PKCE — why public clients need an extra step

A traditional web app with a real backend can hold a client secret safely (server-side config, never
shipped to the browser) and use it in step 4 above. A **public client** — a single-page app or mobile
app with no safe place to hold a secret, since anything shipped to the client is extractable — can't
do this the same way: if it held a real client secret, that secret would be sitting in JS bundle/binary
for anyone to extract.

**PKCE (Proof Key for Code Exchange)** replaces the static secret with a per-flow, single-use one:

1. Before redirecting (step 1 above), the app generates a random `code_verifier`, and sends its hash
   (`code_challenge`) along with the authorization request.
2. In the token exchange (step 4), the app sends the **original** `code_verifier` (not the hash).
3. The provider checks that hashing the received `code_verifier` produces the `code_challenge` from
   step 1 — proving the token exchange is coming from the same client that started the flow, without
   ever needing a long-lived, extractable secret.

**When you need it:** any public client (SPA, mobile app) doing OAuth2/OIDC — it's the standard,
required-by-modern-guidance approach for exactly this tutorial's kind of frontend (a browser app
talking to your backend), and most identity providers now mandate it even for confidential clients as
defense in depth.

## 4. Where this connects to everything built in Modules 1–13

Social login doesn't replace this tutorial's access/refresh token model — it replaces *only* how the
initial identity is established (no password check, Module 1's hashing doesn't apply to these users at
all), and the rest still applies directly:

- After validating the provider's ID token and resolving/creating a local user record, **your own
  backend still issues its own access + refresh token pair** (Module 5) exactly as it would after a
  password login — the frontend doesn't hold onto the provider's tokens for ongoing use.
- `JwtAuthFilter` (Module 6), `SecurityFilterChain` route rules (Module 8), and RBAC (Module 9) are
  completely unaffected — they operate on *your* access token, regardless of whether the session
  started via password or via a provider.
- The one new piece of state: a local user record needs some way to represent "this user has no
  password, they authenticate via Google" (a nullable password field, or a separate
  `auth_provider`/`provider_user_id` column) — and to handle account linking (what happens if someone
  registers with a password using the same email a Google login later presents) deliberately, rather
  than leaving it as an accident of whichever code path runs first.

## 5. Spring Boot's built-in support

`spring-boot-starter-oauth2-client` provides `oauth2Login()` in the `HttpSecurity` DSL, which
implements the redirect dance, code exchange, and ID token validation described above for you,
configured per-provider (client id/secret, provider endpoints — many are pre-configured for common
providers like Google/GitHub) — you plug in a handler for "given this now-authenticated OIDC user,
issue our own tokens," rather than implementing the flow's mechanics by hand.

## Checkpoint questions

1. A client stores an OAuth2 **access token** and treats "this request includes a valid access token"
   as proof of the user's identity. What's wrong with that, precisely, and which token should it have
   used instead?
2. Why can't a single-page app safely use the same client-secret-based token exchange a traditional
   server-rendered app uses? What does PKCE replace the secret with?
3. After a user logs in via Google, does your backend keep using Google's access/ID tokens for
   subsequent requests, or does something from Module 5 take over? Explain why.
4. A user registered with a password months ago, then clicks "Sign in with Google" using the same
   email address today. What decision does your app have to make explicitly, and what happens if you
   don't make it deliberately?
