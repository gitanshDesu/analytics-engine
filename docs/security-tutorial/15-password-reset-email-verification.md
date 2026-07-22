# Module 15 — Password Reset and Email Verification

Two flows every real app needs that Modules 6–7 didn't build: "I forgot my password" and "prove this
email address is actually yours." Both are built from the same primitive — a single-use, time-limited
token sent out-of-band (email) — applied to two different problems, and both are places self-taught
implementations routinely leak information or leave a replay window open.

## Quick reference: What / Why / How / When

| Concept | What | Why | How | When |
|---|---|---|---|---|
| **Password reset token** | A single-use, short-lived, high-entropy token, emailed as a link | Lets a user regain access without support intervention, without weakening the account | Opaque random token (Module 5's reasoning, reused), hashed at rest, one specific purpose only | User claims "forgot my password" |
| **Email verification token** | Same shape, different purpose: prove control of an inbox | Prevents registering with an email you don't own (spam, impersonation, account recovery hijack) | Same opaque-token pattern, longer-lived, still single-use | Right after registration, before granting full trust in the address |
| **Account enumeration** | Leaking "does this email have an account" via response differences | A real, common vulnerability that both flows can accidentally introduce | Identical responses/timing regardless of whether the email exists | Every response on both flows |

## 1. The shared primitive

Both flows follow the same shape, and it's worth recognizing it as one pattern applied twice rather
than two unrelated features:

1. Generate a random, high-entropy, **opaque** token — same reasoning as the refresh token in
   Module 5, section 3: nothing to brute-force, no need for it to be a JWT.
2. Store a **hash** of it server-side (Module 5, section 5's reasoning again), alongside the user id,
   an expiry, a purpose (`PASSWORD_RESET` vs `EMAIL_VERIFICATION` — never let one token type be usable
   for the other's action), and a used/unused flag.
3. Email the **raw** token, embedded in a link, to the address on file — never anywhere else, and
   never logged (Module 10).
4. When the link is followed, look up the token by its hash, check purpose + expiry + unused, perform
   the action, then **immediately mark it used** (or delete it) — single-use, enforced server-side, not
   just by convention.

## 2. Password reset, specifically

**The flow:**
1. User submits "forgot password" with an email.
2. Server looks up the account. **Regardless of whether it exists**, return the same response
   ("if that email is registered, a reset link has been sent") — see section 4, this is the account
   enumeration trap applied to this exact endpoint.
3. If the account exists, generate and store a reset token (section 1), email a link containing the
   raw token.
4. User follows the link, submits a new password alongside the token.
5. Server validates the token (hash lookup, purpose, expiry, unused), and **only if valid**, hashes the
   new password (Module 1) and updates the account.
6. **Critically: invalidate every existing session for that account at this point** — every refresh
   token record (Module 5, section 7), not just this one flow's token. If someone else's active,
   already-stolen refresh token is why the legitimate user is resetting their password in the first
   place, leaving old sessions alive defeats the entire point of the reset.

**Expiry:** shorter than a refresh token (Module 5) — a reset link is meant to be used within minutes,
not days; a long-lived reset link sitting unused in an inbox (or forwarded, or in a compromised mailbox
later) is a standing risk with no offsetting benefit.

## 3. Email verification, specifically

**The flow:** near-identical mechanically, different purpose and timing — issued right after
registration (or after an email-address change), rather than in response to a user-initiated request.

**The design question worth deciding deliberately, not by accident:** does an **unverified** account
get full access immediately, or restricted access until verified? Both are legitimate choices with
different tradeoffs:
- **Full access immediately, verify async** — better first-run UX, but means a spam signup with a
  fake/someone-else's email can still fully use the app before (or without ever) verifying.
- **Restricted until verified** (can log in, but can't do sensitive actions — e.g. can't be added as a
  contact recovery method, can't change the account email again) — safer, adds friction.

Either is defensible; what's *not* defensible is not deciding — leaving verification as a checkbox
that exists in the data model but isn't actually enforced anywhere is equivalent to not having it.

## 4. Account enumeration — the trap both flows walk straight into if you're not careful

**What it is:** an attacker learns whether a specific email address has an account, purely from
observable differences in your API's responses — timing, response body, HTTP status — without ever
needing to guess a password. This is Module 13's account-enumeration concern (touched under broken
access control, generalized) applied concretely here, because password reset and registration are the
two endpoints where it shows up constantly in real (and real-world-breached) apps.

**Where it leaks, concretely:**
- `/forgot-password` returning "no account with that email" vs. "reset link sent" — direct leak.
- `/register` returning "email already in use" vs. success — direct leak in the other direction.
- Either endpoint responding **measurably faster** for the nonexistent-account case (skipping a hash
  comparison or an email-send call that only happens for real accounts) — a timing leak, same family
  of bug as Module 10's timing-safe-comparison point, just at the endpoint-response-time level instead
  of the byte-comparison level.

**The fix, applied consistently:** identical response body and status for both cases
("if that email is registered, you'll receive an email shortly"), and roughly identical response time
— which usually means doing the same amount of work either way (e.g. hashing a dummy value when the
account doesn't exist, so the response isn't suspiciously instant) rather than short-circuiting early
for the "doesn't exist" branch. Whether this exact tradeoff (never confirming an email is registered)
is worth the added friction is itself a product decision — but it should be a decision, made knowingly,
not a side effect of writing the obvious-first response for each branch.

## Checkpoint questions

1. Why must a password reset invalidate *every* existing session, not just complete its own flow?
   What attack scenario does skipping this leave open?
2. A password reset token and an email verification token use the same underlying mechanism. What's
   the one field in the stored record that must differ between them, and what breaks if you skip it?
3. Your `/register` endpoint returns `409 Conflict` for an existing email and `201 Created` for a new
   one. What's the security cost of this, and what would you change?
4. You decide unverified accounts get full access immediately. Name one concrete action you'd still
   want to gate behind verification even so, and why that one specifically.
