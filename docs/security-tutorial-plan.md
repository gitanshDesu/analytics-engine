# Spring Boot Security Tutorial Plan — Authentication & Authorization From Zero

Audience: someone who has built REST APIs in Spring Boot but has never implemented auth themselves —
they've maybe *used* a `@PreAuthorize` someone else wrote, or copy-pasted a JWT filter without
understanding it.

**Goal:** after this tutorial, the reader should be able to design and implement authentication and
authorization for a new Spring Boot service from scratch — including handling something *unfamiliar*
they hit in the future — not just recognize the pattern when they see it again.

Format: this file is the *plan* — outline, objectives, what must land in each module. The actual
tutorial lives in `docs/security-tutorial/`, written module-by-module from this outline, deliberately
**independent of this repo's own code** (a generic example app, "TaskFlow," is used throughout) so the
concepts are learned in the abstract first. The tutorial only connects back to this repo's real
`analytics-backend` auth code in the final module.

Every module ends with **checkpoint questions** the reader should be able to answer unaided before
moving on — this is the self-sufficiency check, not a quiz for its own sake.

---

## Module 0 — Motivating example

**Objective:** don't open with definitions — open with a broken API and let the reader feel the gap.

- Build a trivial, unauthenticated REST API (a task list) and show, concretely, what an attacker can
  do with zero auth in place: read anyone's data, delete anyone's data, impersonate anyone, just by
  changing an id in the URL.
- From that, derive the two separate questions any fix must answer: *"who is making this request"*
  (authentication) and *"what is this identified user allowed to do"* (authorization) — and show they
  are genuinely separable (a logged-in user can still be forbidden from an action).

## Module 1 — Foundations: hashing, salting, encoding, encryption

**Objective:** the vocabulary every later module assumes. Skipping this is why most self-taught JWT
implementations are subtly insecure.

- Encoding vs encryption vs hashing — three different, commonly confused operations; table comparing
  reversibility, purpose, example (Base64 / AES / SHA-256)
- What hashing actually is: deterministic, one-way, fixed-size output, avalanche effect
- Why plaintext password storage is catastrophic — one breach = every password leaked in reusable form
- Why *fast* general-purpose hashes (MD5, SHA-256) are wrong for passwords — GPU/ASIC brute force
  speed — vs *slow*, purpose-built password hashes (bcrypt, scrypt, Argon2) and their tunable work
  factor
- Salt: random per-record value mixed in before hashing — defeats rainbow tables and reveals that two
  users with the same password don't hash identically
- Pepper: brief mention — a secret, app-wide (not per-user) value, defense in depth, stored outside the
  DB
- HMAC: a *keyed* hash, used for integrity/authenticity (this is what signs a JWT) — contrast its goal
  (fast, verifiable, tamper-evident) against password hashing's goal (slow, resistant to brute force)
  so the reader doesn't confuse "we hash passwords" with "we hash tokens" as the same operation with
  the same tool

**Checkpoint:** explain why `SHA-256(password)` alone is insecure for password storage but perfectly
fine for verifying a large file wasn't corrupted.

## Module 2 — AuthN vs AuthZ, and the two mainstream approaches

**Objective:** name the two competing architectures for "remembering" a user across stateless HTTP
requests, before touching code.

- Authentication vs authorization, plain-language analogy (ID card vs permission slip)
- Why HTTP's statelessness forces an explicit mechanism at all
- **Session-based (stateful):** opaque session id in a cookie, actual session data server-side
  (memory/DB/Redis), server does a lookup per request
- **Token-based (stateless), JWT:** self-contained, signed token the server can verify without a
  lookup
- Comparison table: instant revocation, horizontal scaling (shared session store requirement),
  payload size, what's actually stored where
- Preview the hybrid this tutorial builds toward: stateless JWT **access token** + a stateful,
  DB-backed **refresh token** — stateless most of the time, with a deliberate, cheap state touchpoint
  for revocation

**Checkpoint:** given "we need to instantly log a user out of all devices right now," explain why pure
JWT-only auth can't do this without extra state, and what minimal state would fix it.

## Module 3 — Cookies, deep dive

**Objective:** cookies are the transport this tutorial standardizes on for tokens — understand exactly
what the browser does automatically and what each attribute buys you.

- What a cookie is: `Set-Cookie` response header, browser auto-attaches matching cookies on
  subsequent requests
- Attribute-by-attribute: `Domain`, `Path`, `Expires`/`Max-Age`, `HttpOnly`, `Secure`, `SameSite`
  (`Strict`/`Lax`/`None`) — what each does and what breaks if you get it wrong
- `HttpOnly` → JavaScript can't read it via `document.cookie` → the standard XSS-token-theft
  mitigation
- The alternative transport: `Authorization: Bearer <token>` header, client stores the token itself
  and attaches it manually
- Comparison table: cookie (auto-attach, `HttpOnly`-protected from XSS, but exposed to CSRF) vs header
  (manual attach, immune to CSRF, but exposed to XSS if stored somewhere JS can read)
- CSRF explained concretely: a malicious page auto-submits a form/fetch to your API, the browser
  attaches your real cookie because cookies are per-*origin-of-the-target*, not per-origin-of-the-page
  that triggered the request — then the defenses (`SameSite=Lax/Strict`, CSRF tokens, custom-header
  checks)

**Checkpoint:** explain, precisely, why `HttpOnly` defends against XSS but does nothing against CSRF,
and why `SameSite=Strict` defends against CSRF but does nothing against XSS.

## Module 4 — JWT, deep dive

**Objective:** be able to explain every part of a JWT without looking it up, and know its one real
weakness.

- Structure: `header.payload.signature`, each part base64url — **not encrypted**, anyone can decode
  and read the payload
- Header: `alg`, `typ`
- Payload: registered claims (`sub`, `iat`, `exp`, `iss`, `aud`) vs custom claims
- Signature: how it's computed, and what it actually proves (integrity + authenticity, *not*
  confidentiality)
- Symmetric (`HS256`, one shared secret signs and verifies) vs asymmetric (`RS256`/`ES256`, private
  key signs, public key verifies) — when asymmetric earns its complexity (other services need to
  verify but must never hold the signing secret)
- The `alg: none` historical vulnerability — why libraries must allow-list acceptable algorithms
  server-side rather than trust the token's own header
- Why secrets never belong in the payload (it's readable, not sealed)
- The revocation problem restated precisely for JWTs specifically: valid until `exp`, full stop,
  unless you add external state — this is *why* Module 5 exists

**Checkpoint:** paste a JWT into a base64 decoder (no library) and manually identify header, claims,
and explain why doing this does *not* mean you've broken the token's security.

## Module 5 — Access tokens, refresh tokens, and server-side persistence

**Objective:** the two-token pattern, and how to make the "revocable" half safe and useful.

- Why one long-lived token is bad (huge blast radius if stolen, can't revoke) and why one short-lived
  token with no refresh is bad (forces re-login constantly)
- Access token: short-lived (minutes), stateless, sent on every request
- Refresh token: long-lived (days/weeks), used only to mint new access tokens, ideally rarely sent
- Refresh token design: JWT vs **opaque random token** — argue for opaque, because it forces a DB
  lookup on use, which is exactly the revocation hook a pure JWT can't give you
- Server-side persistence model: a `refresh_tokens` (or `sessions`) record per issued token — fields:
  hashed token, user id, device/client info, issued-at, expires-at, revoked flag — this is the
  concrete answer to "session id in DB"
- Why the stored value is a **hash** of the token, not the raw value — same breach-safety reasoning as
  password hashing — but note the hash choice differs: a high-entropy random token doesn't need a
  slow, tunable hash like bcrypt (nothing to brute-force-guess), a fast hash (SHA-256) is a legitimate,
  simpler choice here — good moment to reinforce Module 1's "match the hash to the threat model," not
  "always use bcrypt for everything"
- Refresh token rotation: single-use, issue-and-invalidate-the-old-one on every refresh; reuse of an
  already-rotated token is a strong signal of theft → invalidate the whole chain/session
- One record per device/session enables what a single-token-per-user design cannot: listing active
  sessions, revoking one device without logging out everywhere

**Checkpoint:** design (on paper) the minimal schema for a `refresh_tokens` table that supports "log
me out of just this one device" — what columns, and why each one.

## Module 6 — Building it: Spring Security + JWT + cookies, from scratch

**Objective:** hands-on, generic ("TaskFlow") build — every piece wired by hand, nothing copy-pasted
from a template.

- Dependencies: `spring-boot-starter-security`, a JWT library, `spring-boot-starter-web`
- `SecurityFilterChain` bean, piece by piece: `csrf()` disabled and *why that's justified here*
  (stateless API, no ambient-cookie-triggered state change without the token being validated first —
  still cross-reference Module 3's CSRF section for when this justification does *not* hold),
  `SessionCreationPolicy.STATELESS`, route matchers, filter ordering
- Writing a custom `OncePerRequestFilter`: extract cookie → validate signature/expiry → build an
  `Authentication` → set it on `SecurityContextHolder` — and explain why filters *authenticate* while
  `authorizeHttpRequests` *authorizes* (two separate stages, common confusion point)
- `PasswordEncoder` bean (`BCryptPasswordEncoder`) — ties directly back to Module 1
- Writing the cookie correctly: **note the practical gotcha** that plain `jakarta.servlet.http.Cookie`
  has poor/inconsistent `SameSite` support — use Spring's `ResponseCookie` builder instead, which
  supports every attribute from Module 3 explicitly
- CORS with cookies: `allowCredentials(true)` requires explicit origins, **not** `"*"` — the two
  cannot be combined, explain why (spec-level restriction, not a Spring limitation)

**Checkpoint:** without looking at the code you just wrote, list the exact order of operations that
happen between a browser sending a request with an expired access token cookie and that request
reaching (or being rejected before) your controller method.

## Module 7 — The refresh API, end to end

**Objective:** wire the four endpoints and the client-side flow that uses them correctly.

- `POST /auth/register`, `/login`, `/refresh`, `/logout` — what each must do, server-side, step by
  step
- Client-side refresh pattern: intercept a `401`, call `/refresh` silently, retry the original request
  once — and the race condition this creates (multiple simultaneous 401s each triggering their own
  refresh call) plus the fix (a single in-flight refresh promise every caller awaits)
- Logout correctness: a cookie can only be cleared by a `Set-Cookie` with the **same** `Path` (and
  `Domain`) it was set with — a classic, easy-to-get-wrong gotcha

**Checkpoint:** write out, as a numbered sequence (client → server → client), everything that happens
from "access token cookie expired" to "the user's original request finally succeeds," including the
one thing that must happen server-side before step 1 can even be detected.

## Module 8 — Protected vs public routes, and failure responses

**Objective:** route design and, just as important, what happens when auth/authz fails.

- Route matcher ordering: specific-before-general, `permitAll()` for register/login/refresh, sensible
  default-deny (`anyRequest().authenticated()`) rather than default-allow
- URL-based (`authorizeHttpRequests`) vs method-level (`@PreAuthorize`) authorization — when each is
  the better fit, and that they compose
- The two distinct failure modes and their handlers: `AuthenticationEntryPoint` (401 — not
  authenticated at all) vs `AccessDeniedHandler` (403 — authenticated, but not allowed) — customize
  both to return JSON, not Spring's default whitelabel page/redirect

**Checkpoint:** explain the difference between a 401 and a 403 response using this tutorial's own
terms (authentication vs authorization), and give one concrete request that would trigger each.

## Module 9 — RBAC (role-based access control), kept simple

**Objective:** the reader can gate a route or a method by role, and understands the exact mechanism
enough to extend it to permissions later.

- Roles vs fine-grained permissions — RBAC is the coarse, simple version; name that a
  permission-based model exists for later, don't build it now
- Simple model: a `role` field on the user (`USER`, `ADMIN`), embedded as a claim in the access token
  so no DB hit is needed to authorize
- Spring Security's `GrantedAuthority` and the `ROLE_` prefix convention — the single most common RBAC
  bug: `hasRole("ADMIN")` implicitly expects an authority literally named `ROLE_ADMIN`, while
  `hasAuthority("ADMIN")` expects an exact match with no prefix — mixing these up silently locks
  everyone out or lets everyone in
- Converting the JWT's role claim into `GrantedAuthority` objects inside the auth filter
- URL-based gating: `.requestMatchers("/api/admin/**").hasRole("ADMIN")`
- Method-based gating: `@EnableMethodSecurity` + `@PreAuthorize("hasRole('ADMIN')")`
- Multiple roles per user, and where this simple model would need to evolve (permission tables,
  role-permission join) if requirements grow — named as a future direction, not built here

**Checkpoint:** a request comes in from a user with authority `ROLE_ADMIN`. Will
`.hasRole("ADMIN")` pass? Will `.hasAuthority("ADMIN")` pass? Explain both answers.

## Module 10 — Hardening checklist and concept glossary

**Objective:** a fast-recall pass over every small related concept referenced earlier, plus the
production-hardening items that don't warrant their own module but must not be skipped.

- Glossary recap: encoding vs encryption vs hashing, salt, pepper, HMAC, nonce, timing-safe comparison
  (why `.equals()` on secrets is itself a subtle vulnerability)
- Rate limiting and brute-force lockout on login/refresh endpoints
- Secrets management: env vars/secret manager, never hardcoded, never committed — and what to do if
  one leaks (rotate immediately, invalidate everything signed with it)
- HTTPS everywhere (cookies marked `Secure` are silently dropped over plain HTTP — another common
  "why isn't my cookie showing up" gotcha)
- Security headers worth knowing: HSTS, CSP (one paragraph each, not a deep dive)
- Never log tokens, passwords, or full Authorization headers
- Principle of least privilege, as a design habit, not just an RBAC feature

## Module 11 — Worked example (full build)

**Objective:** one continuous, working build of "TaskFlow" that exercises every module above in
order, so the reader sees the pieces connected rather than in isolation.

Build order: `User` entity + `PasswordEncoder` → `/register` → `/login` issuing access + refresh
cookies → JWT auth filter → a protected `/api/tasks` route → `/refresh` → `/logout` → add a `role`
field and gate `/api/admin/tasks` with RBAC from Module 9. Show the code at each step, not just the
end state.

## Module 12 — Assignment: build it yourself

**Objective:** prove self-sufficiency — new requirements, not the worked example repeated, with
enough ambiguity that the reader must apply the *concepts*, not recall a snippet.

Build a second, different service (e.g. a "BookShelf" API) that:
1. Registers/logs in users with hashed passwords and issues cookie-based access + refresh JWTs
2. Has at least one public route and one route requiring authentication
3. Adds a `role` (`MEMBER`/`LIBRARIAN`) and RBAC-gates one route to `LIBRARIAN` only
4. Implements refresh rotation with reuse detection
5. **Stretch, deliberately under-specified to force independent design:** support "log out of just
   this device" while other devices stay logged in, and lock an account out for 5 minutes after 5
   failed login attempts — neither is covered verbatim earlier; the reader has to combine Module 5's
   per-session record with new logic

## Module 13 — Common web attacks: XSS, CSRF, and more

**Objective:** a single reference catalog of the attacks this tutorial's defenses actually target,
each explained the same way — **What** it is, **Why** it works, **How** it's carried out, **When**
you're exposed and what defends against it — so the reader can reason about something unfamiliar in
the future by applying the same four questions, not by recalling a specific mitigation from memory.

Cover, each with the What/Why/How/When treatment: XSS (stored/reflected/DOM-based), CSRF (full
mechanical treatment already lives in Module 3, section 6 — this module cross-references and
consolidates rather than repeating), SQL/NoSQL injection, session hijacking vs session fixation,
replay attacks, man-in-the-middle, brute force and credential stuffing, clickjacking, and broken
access control / IDOR (naming Module 0's original motivating bug explicitly as this category).

Position this module as a reference chapter: readable any time after Module 3 (it assumes the
cookie/CSRF vocabulary from there), not strictly gated behind Modules 4–12. Placed at 13, immediately
before the repo tie-back, so the hands-on modules land first and this serves as a consolidated recap
before connecting everything to real code.

## Module 14 — OAuth2 / OpenID Connect: social login and delegated auth

**Objective:** "Sign in with Google" is a fundamentally different arrangement from everything built so
far (another party vouches for identity; your server never sees a password) — cover it as its own
module rather than a footnote, since it's one of the most common real-world auth requirements this
tutorial hadn't touched.

- OAuth2 (delegated **authorization**) vs OpenID Connect (**authentication** layered on top) — the
  distinction, and the real, common mistake of treating an OAuth2 access token as identity proof
  instead of the OIDC ID token
- The Authorization Code flow, step by step, and why the code is exchanged server-to-server rather
  than handed back directly through the browser redirect
- PKCE — why public clients (SPAs, mobile apps) can't use a static client secret, and what replaces it
- Where this connects back to Modules 5–9: your backend still issues its own access/refresh tokens
  after resolving the provider's identity; `JwtAuthFilter`, route rules, and RBAC are unaffected;
  account linking (password-registered email later signing in via Google) is the one new decision to
  make deliberately
- Spring Boot's `spring-boot-starter-oauth2-client` / `oauth2Login()` as the built-in implementation of
  the mechanics above

## Module 15 — Password reset and email verification

**Objective:** two flows every real app needs that the core build (Modules 6–7) didn't cover, built
from one shared primitive — a single-use, time-limited, out-of-band token — applied to two different
problems.

- The shared pattern: opaque token (Module 5's reasoning reused), hashed at rest, purpose-scoped
  (never let a reset token double as a verification token), single-use enforced server-side
- Password reset flow end to end, including the easy-to-miss step: invalidate **every** existing
  session (all refresh token records, Module 5 section 7) on a successful reset, not just complete the
  reset flow's own token
- Email verification: the deliberate product decision of full-access-immediately vs
  restricted-until-verified, and why leaving it undecided is equivalent to not having verification at
  all
- **Account enumeration**, concretely, on exactly these two endpoints — where response
  content/status/timing differences leak whether an email is registered, and the fix (identical
  responses, matched timing) — a specific, concrete instance of Module 13's broken-access-control
  category

## Module 16 — Tying it back to this repo

**Objective:** now, and only now, map every concept onto `analytics-backend`'s real
`SecurityConfig`/`JwtAuthFilter`/`TokenService`/`AuthService`/`AuthController`, explain the specific
choices made and why, and name the deliberate simplifications (single refresh token per `User`
document rather than a `refresh_tokens`/sessions collection; no RBAC at all yet — flat `User` model)
as concrete next exercises using Modules 5 and 9.

---

## Further topics, named but not covered in depth

Kept as a short, explicit list so the tutorial maps the full territory even where it doesn't go deep:
**multi-factor authentication (TOTP)**, **API keys / service-to-service (M2M) authentication**,
**CORS preflight (`OPTIONS`) request mechanics**, and **security audit logging** (what *to* log about
auth events, the positive counterpart to Module 10's "never log secrets").

---

## Suggested ordering / pacing

Modules 0–5 are conceptual and can be read in one sitting — do not skip Module 1 to get to JWTs
faster, the hashing/salting vocabulary is assumed everywhere after. Modules 6–9 are hands-on, done at
a keyboard. Module 10 is a reference checklist, revisit it rather than memorize it. Modules 11–12 are
where the "can they do this unaided" bar actually gets tested. Module 13 (attack catalog) can be read
any time after Module 3 if the reader wants the fuller XSS/CSRF/injection picture earlier — it's
placed at 13 as a pre-recap, not because it depends on Modules 4–12. Modules 14–15 (OAuth2/OIDC,
password reset & email verification) are additional real-world flows, each reasonably self-contained —
read them whenever that specific need comes up, they don't block anything after them. Module 16 is
read last, deliberately — reading it first would let pattern-matching substitute for understanding.
