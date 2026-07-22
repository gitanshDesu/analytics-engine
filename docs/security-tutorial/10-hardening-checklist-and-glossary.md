# Module 10 — Hardening Checklist and Concept Glossary

A fast-recall pass over the small related concepts referenced earlier, plus the production items that
don't warrant a full module but must not be skipped. Treat this as a checklist to revisit, not prose
to memorize once.

## Glossary recap

| Term | One-line definition |
|---|---|
| **Encoding** | Reversible format conversion, no secret needed (Base64) — not security |
| **Encryption** | Reversible, but only with a key — for confidentiality |
| **Hashing** | One-way, fixed-size, deterministic — for integrity/verification |
| **Salt** | Random per-record value mixed into a hash input — defeats rainbow tables |
| **Pepper** | Secret, app-wide value, stored separately from the data it protects — defense in depth |
| **HMAC** | Keyed hash — fast, proves integrity + authenticity (not confidentiality) — signs JWTs |
| **Nonce** | "Number used once" — a value meant to be used exactly one time, to prevent replay of an otherwise-valid message |
| **Timing-safe comparison** | Comparing two secrets in constant time regardless of where they first differ — see below |

## Timing-safe comparison — a subtle one worth its own paragraph

Comparing two secret strings with a naive `.equals()` (or `==`) typically short-circuits on the first
differing character — which means the comparison takes *microscopically* longer the more leading
characters match. In principle, an attacker who can measure response timing precisely enough (and
send enough requests) can use that timing difference to guess a secret one character at a time,
without ever seeing it directly. This mostly matters for comparing raw secrets/signatures/API keys
directly (most JWT and HMAC libraries already do this correctly internally) — but if you ever hand-roll
a comparison against a secret value (an API key check, a webhook signature check), use your language's
constant-time comparison utility instead of `.equals()`.

## Rate limiting and brute-force lockout

Without a limit, `/login` and `/refresh` are guessable-credential and stolen-token brute-force targets
respectively (Module 13's brute-force/credential-stuffing entry). Minimum viable protection: cap failed
login attempts per account (and/or per IP) within a window, and lock out or add increasing delay past
the threshold — Module 12's assignment asks you to build exactly this (5 failed attempts → 5-minute
lockout). The rest of this section covers the actual techniques, since "add rate limiting" is
frequently assigned and rarely explained.

**Keying the limit — account, IP, or both, and why it matters which:**
- **Per-account** — catches brute force against one specific target, but a distributed attacker
  (botnet, many IPs) sails through if you only key by IP.
- **Per-IP** — catches a single attacker spraying many accounts (credential stuffing) from one
  source, but a legitimate office/NAT full of real users sharing one public IP can get collectively
  penalized by one bad actor.
- **Both, independently** — the realistic choice: an account-level counter catches "one account,
  many sources," an IP-level counter catches "one source, many accounts." Neither alone covers both
  attack shapes.

**Algorithms, in increasing sophistication:**

| Algorithm | How it works | Weakness |
|---|---|---|
| **Fixed window** | Count requests in the current clock-aligned window (e.g. "this calendar minute"); reset to zero at each boundary | Bursty at window edges — a client can send the limit twice in quick succession by timing requests around a boundary (end of one window, start of the next) |
| **Sliding window** | Count requests in the last N seconds, continuously, not clock-aligned | Smooths out the edge-burst problem; more bookkeeping (needs timestamps, not just a counter) |
| **Token bucket** | A bucket holds up to N tokens, refills at a steady rate, each request consumes one; empty bucket = rejected/delayed | Allows controlled bursts (a full bucket) while enforcing a steady average rate — the standard choice for production APIs |

**Where the counter lives:** an in-memory counter works for a single instance but resets on restart
and doesn't coordinate across multiple instances behind a load balancer — a shared store (Redis is the
common choice, often with a library like Bucket4j implementing token bucket on top of it) is needed
the moment you run more than one instance, for the same reason Module 2 flagged shared state as the
cost of moving off pure-stateless auth.

**What to return while locked out, and a subtle information-leak trap:** a locked-out account and a
simply-wrong-password attempt should, ideally, return **indistinguishable** responses and take
**similar** time to respond — a response that clearly says "this account is locked" (vs. a generic
"invalid credentials") lets an attacker enumerate which emails are registered accounts at all, and a
response that returns *instantly* for a locked account but does a full password hash comparison
(Module 1's deliberately slow bcrypt) for a wrong-password attempt leaks the same information via
timing instead of content.

## Secrets management

- JWT signing secrets, DB credentials, and any API keys belong in environment variables or a secret
  manager — **never** hardcoded, **never** committed to version control.
- If a secret leaks (accidentally committed, logged, exposed via a misconfigured endpoint): rotate it
  immediately. For a JWT signing secret specifically, rotating it invalidates **every** currently
  outstanding access token signed with the old one (forces re-login for everyone) — a blunt but
  correct response to "the thing that makes all our tokens trustworthy is now public."

## HTTPS everywhere

A `Secure`-flagged cookie (Module 3) is silently dropped over plain HTTP — not an error, just never
sent. Beyond that specific gotcha: any token or credential sent over plain HTTP is trivially
interceptable on the network path. There is no partial-credit version of "use HTTPS."

## Security headers (brief)

- **HSTS (`Strict-Transport-Security`)** — tells the browser to *never* attempt a plain-HTTP connection
  to your domain again, even if a link or bookmark says `http://` — closes the window where a first
  request could be intercepted before an HTTP→HTTPS redirect happens.
- **CSP (`Content-Security-Policy`)** — restricts which sources scripts/styles/etc. can load from,
  meaningfully reducing what an XSS payload can actually do even if it gets injected. Not a substitute
  for fixing the underlying XSS hole, but real defense in depth.

## Never log sensitive values

Don't log full tokens, passwords (obviously), or full `Authorization` headers — logs are often
retained longer, replicated further, and accessible to more people than the primary datastore. If you
need to log "which token" for debugging, log a token *id* or a truncated/hashed reference, never the
usable value itself.

## Principle of least privilege

Not just an RBAC feature (Module 9) — a design habit. Default-deny route configuration (Module 8), a
`role` claim rather than "is logged in = can do everything," a DB user for your app with only the
permissions it actually needs, a refresh-token cookie scoped to only the `/auth` path it's needed on
(Module 7) — all the same instinct applied at different layers: grant the minimum access that lets the
legitimate case work, nothing more "just in case."

## Checklist

- [ ] Passwords hashed with bcrypt/scrypt/Argon2, never a fast general-purpose hash
- [ ] Access tokens short-lived; refresh tokens opaque, hashed at rest, rotated on use
- [ ] `HttpOnly` + `Secure` + explicit `SameSite` on every auth cookie
- [ ] CORS: explicit origins if `allowCredentials(true)`, never a wildcard
- [ ] Default-deny route config (`anyRequest().authenticated()` as the catch-all)
- [ ] 401 vs 403 both return structured JSON, not framework default pages
- [ ] Login/refresh endpoints rate-limited / lockout-protected
- [ ] Signing secrets and credentials in env/secret manager, never committed
- [ ] Full HTTPS, HSTS enabled
- [ ] No tokens/passwords/full auth headers in logs

## Checkpoint questions

1. Why does a `Secure`-flagged cookie failing to appear in a local HTTP dev environment often confuse
   people the first time they hit it?
2. Explain, in your own words, why `.equals()` on a secret string can theoretically leak information
   through timing, and why this is rarely exploitable in practice but still worth avoiding.
3. If your JWT signing secret leaks, what's the actual blast radius, and what's the one correct
   response?
4. Why does rate limiting need both an account-level *and* an IP-level counter, rather than just one
   or the other?
5. Explain why a locked-out account should ideally return a response that's indistinguishable — in
   both content *and* timing — from a simple wrong-password response. What does an attacker learn if
   it isn't?
