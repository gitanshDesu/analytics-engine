# Module 2 — AuthN vs AuthZ, and the Two Mainstream Approaches

## Quick reference: What / Why / How / When

| Concept | What | Why | How | When |
|---|---|---|---|---|
| **Authentication (AuthN)** | Verifying identity | Nothing else can be decided until "who" is known | Credentials checked once, then a token/session proves it on later requests | Every request that isn't explicitly public |
| **Authorization (AuthZ)** | Deciding what a known identity may do | A valid identity isn't automatically an allowed one | Rule/role/permission check against the authenticated identity | Every action on a specific resource |
| **Session-based auth** | Opaque id in a cookie, real data server-side | Simple, instantly revocable | Server does a store lookup every request | Traditional server-rendered apps, single-instance or shared-store deployments |
| **Token-based auth (JWT)** | Self-contained, signed identity data | No per-request lookup needed, scales horizontally | Server verifies a signature, trusts the claims | Stateless APIs, especially with multiple server instances |

## 1. Authentication vs authorization, precisely

- **Authentication (AuthN):** verifying identity — "prove you're who you say you are." The output is
  a confirmed identity (or "anonymous").
- **Authorization (AuthZ):** given a confirmed identity, deciding what that identity may do. The
  output is allow/deny for a specific action on a specific resource.

Analogy: authentication is showing an ID card at a building's front desk. Authorization is whether
your ID badge opens a specific door once you're inside. You can be fully, correctly identified and
still have the wrong badge for a given door — the two checks are independent, and a real system needs
both, run in that order.

## 2. Why HTTP forces an explicit mechanism at all

HTTP is stateless by design — the server, by default, treats every request as if it's the first one
it has ever seen from that client. There is no built-in "remember this browser" concept. Everything
this tutorial builds is, at bottom, a way of attaching *identity-proving information* to each request
so the server doesn't have to treat every request as a stranger's.

There are exactly two mainstream ways to attach that information.

## 3. Approach 1 — Session-based (stateful)

1. User logs in with credentials.
2. Server creates a **session record** (server-side — in memory, a database, or a shared cache like
   Redis) containing whatever the server needs to know about this logged-in user, keyed by a randomly
   generated **session id**.
3. Server sends the browser a cookie containing *only* that session id — an opaque string, meaningless
   on its own.
4. Every subsequent request, the browser sends the cookie back automatically; the server looks up the
   session id in its store, and if found, treats the request as coming from that user.

Nothing about the user's identity is in the cookie itself — it's a lookup key. The server does a
lookup (memory/DB/Redis) on **every single request**.

## 4. Approach 2 — Token-based (stateless), JWT

1. User logs in with credentials.
2. Server creates a **signed token** (a JWT — Module 4 covers its structure fully) containing the
   user's identity and other claims directly, and cryptographically signs it.
3. Server sends this token to the client (cookie or header — Module 3 covers the transport choice).
4. Every subsequent request, the client sends the token back; the server **verifies the signature**
   (a fast cryptographic check, no database involved) and, if valid, trusts the claims inside it
   directly — no lookup needed.

The identity data travels *inside* the token itself, self-contained and tamper-evident, rather than
living behind a lookup key.

## 5. Comparison

| | Session-based | Token-based (JWT) |
|---|---|---|
| Where's the identity data? | Server-side store, cookie holds only a lookup key | Inside the token itself (signed, not encrypted) |
| Per-request cost | A store lookup (memory/DB/Redis) every request | Signature verification only — no store lookup |
| Instant revocation ("log out now") | Trivial — delete the server-side record | **Not possible** on its own — token is valid until it expires, no matter what the server does, unless you add external state |
| Horizontal scaling | Needs a *shared* store (Redis, DB) across all server instances, or sticky sessions | Any instance can verify independently — no shared store needed for verification |
| Payload size | Small (just an id) | Larger (encodes the actual claims) |
| Typical transport | Cookie (this is the classic pairing) | Cookie or `Authorization` header (both work; Module 3 covers the tradeoff) |

## 6. The revocation problem, and the hybrid this tutorial builds

The single biggest practical weakness of pure JWT auth is right there in the table: **you cannot force
a JWT to stop being valid before its `exp` claim** without adding some server-side state back in —
which gives up the "no lookup needed" benefit that made JWTs attractive in the first place.

The standard resolution, and the one this tutorial builds from Module 5 onward, is a **hybrid**:

- **Access token** — a JWT, short-lived (minutes), stateless, verified with no DB lookup, used on
  every request. Its short lifetime bounds how long a compromise or an "I need to revoke this right
  now" situation can matter before it naturally expires.
- **Refresh token** — long-lived, backed by a **server-side record** (this is the "session id in a
  database" pattern, just applied narrowly to the refresh token rather than every request) — the one
  deliberate, cheap state touchpoint that makes real revocation possible again, without paying the
  per-request DB lookup cost of a fully session-based system.

You get JWT's stateless, no-lookup verification for the vast majority of requests, and a real
revocation hook at the one point (refreshing) where a lookup is cheap to afford.

## Checkpoint questions

1. A support engineer needs to force-logout a user *right now* because their laptop was stolen. Can
   you do this with pure JWT access-token-only auth? What's the minimum change needed to make it
   possible?
2. Why does a purely session-based system need a shared store (like Redis) once you run more than one
   server instance, while a purely JWT-based system doesn't?
3. In the hybrid model, which token is stateless and which is stateful — and why is it the *refresh*
   token that carries the state, not the access token?
