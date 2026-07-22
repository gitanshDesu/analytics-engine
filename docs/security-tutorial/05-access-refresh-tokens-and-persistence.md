# Module 5 — Access Tokens, Refresh Tokens, and Server-Side Persistence

This module answers the question Module 4 deliberately left open: how do you get JWT's stateless
speed *and* real revocation? And it answers your specific question about "session id in DB" — that
pattern lives here, applied to the refresh token.

## Quick reference: What / Why / How / When

| Concept | What | Why | How | When |
|---|---|---|---|---|
| **Access token** | Short-lived JWT sent on every request | Bounds the damage window if stolen | Verified by signature alone, no DB hit | Every authenticated request |
| **Refresh token** | Long-lived opaque token, used only to mint new access tokens | Avoids forcing re-login every few minutes, while staying revocable | DB lookup by hash on every use | Only when the access token has expired |
| **Refresh token record ("session id in DB")** | Server-side row per issued refresh token | The one deliberate revocation hook in an otherwise stateless system | Table/collection: hash, user id, expiry, revoked flag | Whenever real revocation (logout, theft response) matters |
| **Rotation + reuse detection** | New refresh token issued on every use, old one invalidated | A replayed old token is a strong theft signal | Reject reused tokens, revoke the whole session on detection | Every refresh call |
| **`jti` + revocation cache** | Unique id per access token + a small deny-list checked in the filter | Closes the "can't revoke an access token early" gap | Cache lookup by `jti`, TTL matched to remaining `exp` | Only when instant, individual access-token kill is a real requirement |

## 1. Why not just one token?

- **One long-lived JWT, no refresh:** if it's stolen (XSS, a leaked log, a compromised device), the
  attacker has full access for the token's entire (long) lifetime, and you can't revoke it early
  (Module 4, section 8). Bad blast radius.
- **One short-lived JWT, no refresh:** safer if stolen (small window), but the user gets logged out
  every few minutes with no graceful way back in — terrible UX, and it pressures teams into making the
  token long-lived "for usability," which reintroduces the first problem.

Neither works alone. The fix is to split the job across two tokens with different lifetimes and
different jobs.

## 2. The two-token pattern

- **Access token** — short-lived (typically 5–15 minutes), a JWT, stateless, sent with every
  authenticated request, verified by signature alone (no DB hit). If stolen, the damage window is
  bounded by its short expiry.
- **Refresh token** — long-lived (days to weeks), used for exactly one purpose: exchange it for a new
  access token. Sent rarely (only when the access token has expired), which is exactly why it's
  affordable to back it with real server-side state.

## 3. Refresh token design: JWT or opaque?

You *could* make the refresh token a JWT too. Don't. Make it an **opaque random token** — a
cryptographically random string (e.g. a UUID or a random byte string, base64-encoded) with no
structure and no embedded claims.

Why opaque wins here: a JWT refresh token would be self-verifying, which means — same as the access
token — it can't be revoked early without extra state. But the refresh token is *precisely* the piece
you want revocable (it's the long-lived, high-value one). An opaque token forces the server to look it
up in a database on every use — and that forced lookup is a feature here, not a cost, because it's the
revocation hook. You're deliberately trading the "no lookup" property away for the *one* token where
you actually need it back.

## 4. Server-side persistence: the "session id in DB" pattern

Every issued refresh token gets a record, conceptually a `refresh_tokens` (or `sessions`) table:

| Column | Purpose |
|---|---|
| `id` | Primary key for this record |
| `user_id` | Who this token belongs to |
| `token_hash` | Hash of the token value — never the raw token (section 5) |
| `device_info` | Optional — user agent, IP, or a client-chosen device label, for "manage your sessions" UX |
| `issued_at` | When this token was created |
| `expires_at` | When it stops being valid, checked at lookup time |
| `revoked` | Boolean (or a `revoked_at` timestamp) — flip this to kill the session instantly |

This is what "session id in the database" means in practice, once you already have JWT access tokens:
the *access* token stays fully stateless, but each refresh token corresponds to exactly one row here,
and that row is your revocation switch.

## 5. Why store a *hash* of the refresh token — and which hash

Same breach-safety logic as password storage (Module 1): if the database leaks, raw refresh tokens in
it are immediately usable by whoever has the leak. Store `hash(token)`, and on refresh, hash the
incoming token and compare against the stored hash.

**But the hash choice is different from passwords, deliberately.** A refresh token is a long,
high-entropy, randomly generated value — not a short, guessable, human-chosen secret like a password.
There's no realistic dictionary or brute-force attack against a 128-bit random token the way there is
against `"password123"`. That means a **fast** hash (SHA-256) is a legitimate, simpler choice here —
you don't need bcrypt's deliberate slowness, because there's nothing feasible to brute-force in the
first place. This is the practical payoff of Module 1's "match the hash to the threat model, don't
reach for bcrypt reflexively for everything" — passwords need slow hashing because they're guessable;
refresh tokens don't need it because they aren't.

## 6. Refresh token rotation and reuse detection

**Rotation:** every time a refresh token is used, issue a brand-new one and invalidate the one that
was just used (mark it revoked, or delete it and insert a fresh row). Never let the same refresh token
be reused indefinitely.

**Reuse detection:** if a refresh token that's already been rotated (i.e., already used once and
replaced) shows up again, that's a strong signal someone has a stolen copy of an old token — the
legitimate client only ever has the *latest* one. Treat this as an active-compromise signal: revoke
the entire session (and arguably every other active session for that user) rather than quietly
rejecting the one request.

## 7. Why per-device records enable things a single-token design can't

If you store exactly *one* refresh token per user (one field on the `User` row, overwritten on every
login), logging in on a second device silently invalidates the first — there's only ever one live
token. A `refresh_tokens` table with one row **per issued token** (per login, per device) instead
gives you:

- **List active sessions** — query all non-revoked, non-expired rows for a user
- **Revoke one device without logging out everywhere** — delete/revoke just that row
- **"Log out everywhere"** — revoke all rows for that user at once

This is strictly more capable than the single-field model, at the cost of one extra table and a
slightly more involved login/refresh/logout implementation. Module 12's assignment asks you to build
exactly this.

## 8. Closing the gap Module 4 left open: revoking an access token before it expires

Everything above makes the **refresh** token fully revocable. It deliberately does nothing for the
**access** token — Module 4, section 8 named this precisely: a validly-signed, unexpired JWT passes
verification no matter what, full stop. Most of the time that's an acceptable tradeoff *because*
access tokens are short-lived (the compromise window is naturally small) — but "acceptable most of the
time" isn't the same as "solved," and a real incident (a support engineer needs a specific device's
access **cut off right now**, not in up-to-fifteen-minutes) exposes that gap directly.

**The fix, when instant access-token revocation is a real requirement, not a hypothetical:** add a
**`jti`** (JWT ID) claim — a unique, random id — to every issued access token, and maintain a small
**revocation cache** (a fast key-value store, e.g. Redis, with an entry's own TTL set to match the
token's remaining `exp`) that the auth filter checks *in addition to* the signature/expiry check
already in place:

```java
Claims claims = tokenService.parseAndValidate(token).getPayload();
String jti = claims.get("jti", String.class);

if (revocationCache.contains(jti)) {  // one fast lookup, e.g. Redis EXISTS
    // treat exactly like an invalid token — leave SecurityContext empty
} else {
    // proceed as before
}
```

To revoke a specific access token immediately (device lost, incident response), add its `jti` to the
cache with a TTL equal to its remaining `exp` — no need to remember it any longer than the token itself
would have been valid anyway, since it's harmless once naturally expired.

**Why this isn't the tutorial's default, and when it's worth the cost:** it reintroduces exactly the
per-request lookup JWTs were meant to avoid (Module 2) — just against a much smaller, purpose-built,
typically-empty cache instead of a full user/session lookup, so the cost is far lower than reverting to
session-based auth entirely, but it's not free. Reach for this specifically when "instant, individual
access-token kill" is a real product/compliance requirement; if "blocked at next refresh, within
`accessTtlMs`" (this tutorial's default) is fast enough for your threat model, the extra cache and
lookup aren't worth adding.

## Checkpoint questions

1. Design, on paper, the minimal `refresh_tokens` schema needed to support "log me out of just this
   one device." Which column makes that specific feature possible, and how would the query look?
2. Why is an opaque random string a better refresh token than a JWT, given that JWTs are the "better"
   choice for the access token?
3. Why is SHA-256 an acceptable hash for a refresh token but not for a password, when Module 1 said
   fast hashes are wrong for secrets?
4. A refresh token that was already rotated (used once, replaced) is submitted again. What should the
   server do, and why is "just reject this one request" not aggressive enough?
5. Why does the revocation cache entry's TTL matter — what would go wrong (in each direction: too
   short, too long) if you picked it carelessly instead of matching the token's remaining `exp`?
6. You're asked to add "kill this one access token right now." Explain why this can't be done by only
   editing the `refresh_tokens` table from section 4 — what's actually true about access tokens that
   makes that insufficient?
