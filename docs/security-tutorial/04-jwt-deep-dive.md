# Module 4 — JWT, Deep Dive

By the end of this module you should be able to explain every part of a JWT without looking anything
up, and state its one real structural weakness precisely.

## Quick reference: What / Why / How / When

| Concept | What | Why | How | When |
|---|---|---|---|---|
| **JWT** | A signed, self-contained identity token | Stateless verification, no per-request DB lookup | `header.payload.signature`, base64url — encoded, not encrypted | Stateless APIs, as the access token in this tutorial's hybrid model |
| **`HS256` (symmetric)** | One shared secret signs and verifies | Simpler when one service does both | `HMAC(secret, header+payload)` | Single service issuing and verifying its own tokens |
| **`RS256`/`ES256` (asymmetric)** | Private key signs, public key verifies | Verifiers don't need the power to issue | Public key distributed to verifiers, private key stays with the issuer | Multiple services must verify tokens they don't issue |
| **`exp` / `iat`** | Expiry / issued-at claims | Bounds how long a token (and any compromise) matters | Checked on every verification, must not be skipped | Every token, always |

## 1. Structure: `header.payload.signature`

A JWT is three base64url-encoded segments joined by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3Ii...LCJleHAiOjE3MDB9.4f8s9d...
└──────────── header ────────────┘ └──────────── payload ────────────┘ └── signature ──┘
```

**Critical fact: base64url is encoding, not encryption (Module 1).** Anyone — the user, an attacker
who intercepts the token, a browser extension — can decode the header and payload with zero secret
knowledge. Paste any JWT into a base64 decoder and you'll read the claims in plain text. The signature
is what makes the token *trustworthy* (unforgeable, tamper-evident); it does not make the payload
*secret*.

**Never put anything confidential in a JWT payload** — no passwords, no secrets, no data the user
shouldn't see about themselves or others.

## 2. Header

```json
{ "alg": "HS256", "typ": "JWT" }
```

`alg` names the signing algorithm; `typ` is just a type tag. Section 6 covers why trusting this field
blindly, historically, was a real vulnerability.

## 3. Payload (claims)

**Registered (standard) claims** — not mandatory, but standardized meaning if present:

| Claim | Meaning |
|---|---|
| `sub` | Subject — who this token is about, typically the user id |
| `iat` | Issued-at timestamp |
| `exp` | Expiry timestamp — after this, the token must be rejected |
| `iss` | Issuer — who created this token |
| `aud` | Audience — who this token is intended for |

**Custom claims** — anything else your application needs, e.g. `email`, or (Module 9) a `role` claim
for RBAC. Keep the payload small — it travels on every request if sent as a cookie/header.

## 4. Signature

Computed by the server as, for the HMAC case:

```
HMAC-SHA256( base64url(header) + "." + base64url(payload), secret )
```

To verify a token, the server recomputes this same value using its own secret and compares it to the
signature on the token. If they match, the header+payload haven't been altered since signing, **and**
whoever produced this token knew the secret. That's the entire trust guarantee: integrity +
authenticity, not confidentiality (restated from section 1 because it's the most commonly missed
point).

## 5. Symmetric vs asymmetric signing

| | Symmetric (`HS256`) | Asymmetric (`RS256` / `ES256`) |
|---|---|---|
| Keys | One shared secret, used for both signing and verifying | A private key signs, a separate public key verifies |
| Who can issue tokens | Anyone with the shared secret | Only the holder of the private key |
| Who can verify tokens | Anyone with the shared secret — meaning anyone who can verify can *also* forge | Anyone with the public key — verifying does **not** grant the ability to forge |
| When to use | Single service issues and verifies its own tokens (this tutorial's case) | Multiple services need to *verify* tokens but must never be able to *issue* them — e.g. microservices trusting a central auth service's tokens without holding its signing key |

If you only have one backend service doing both issuing and verifying, `HS256` is simpler and
sufficient. Reach for `RS256`/`ES256` specifically when verification needs to be distributed to
parties that shouldn't be able to mint tokens themselves.

## 6. The `alg: none` lesson

Early, naive JWT library implementations trusted the `alg` field *from the token itself* to decide how
to verify it. An attacker could craft a token with `"alg": "none"` (a real, spec-defined value meaning
"unsigned") and some libraries would honor it — accepting a completely unsigned, freely-editable token
as valid. Others accepted an `RS256`-issued token but let an attacker resubmit it as `HS256`, signed
using the *public* key (which is, well, public) as if it were an HMAC secret.

**Lesson, and it generalizes past this one historical bug:** never let attacker-controlled input decide
which cryptographic algorithm or key to use for verification. Modern JWT libraries fix this by having
the verifying code explicitly declare the expected algorithm and reject anything else — but this is
exactly the kind of "obscure thing you'll face in the future" this tutorial is meant to prepare you to
reason about from principles, not just recall as trivia: whenever *any* protocol lets the sender
declare "how to check my own authenticity," treat that declaration as untrusted and pin the
expectation server-side instead.

## 7. `exp`, `iat`, and clock skew

The server must **always** check `exp` on every verification — an unexpired signature check alone
proves authenticity, not currency. Most libraries do this by default when you call their standard
"parse and verify" method; know that this checking is happening, don't disable it. A small clock-skew
allowance (a few seconds) is common in distributed systems where server clocks aren't perfectly
synced, but keep it small — it directly widens the window an expired-but-recently-valid token stays
usable.

## 8. The revocation problem, restated precisely

A validly-signed, non-expired JWT **will pass verification**, no matter what the server "wants" at
that moment — there is no way to ask "wait, has this specific token been revoked?" without adding
external state (a blocklist of revoked token ids, or the refresh-token-backed pattern in Module 5).
This is the direct, unavoidable consequence of statelessness: the whole point of a JWT was to avoid a
per-request lookup, and revocation is fundamentally a lookup ("check against something that can
change"). You can't have instant revocation and zero server-side lookups at the same time — pick
where you pay the cost. This tutorial's answer (Module 5) is: pay it rarely, at refresh time, not on
every request.

## 9. Signing key rotation, without invalidating every outstanding token at once

Section 8 covered revoking one specific token. A related but different problem: what if the **signing
key itself** needs to change — scheduled rotation as a hygiene practice, or an emergency response to a
suspected leak — without forcing every currently logged-in user to re-authenticate the instant you
switch keys?

**The naive approach and why it's disruptive:** swap the secret in config and redeploy. Every token
signed with the old secret now fails verification immediately — every active user is logged out at
once, mid-session, the moment the new key goes live.

**The standard fix: a key identifier in the header, and multiple valid keys at once.** JWTs support a
`kid` (key id) claim in the **header** (not the payload) naming which key signed this particular
token. The verifying server keeps a small set of currently-valid keys (not just one), looks up the
right one by `kid`, and verifies against that specific key:

1. Generate a new key, add it to the server's set of *acceptable* verification keys, but keep signing
   new tokens with the *old* key for now.
2. Switch **issuance** over to the new key (new tokens get the new `kid`); the old key remains in the
   acceptable-verification set.
3. Once every token that could have been signed with the old key has naturally expired (bounded by
   your access token's short lifetime, section 7 — one more reason short-lived access tokens matter),
   remove the old key from the acceptable set entirely.

Nobody is forcibly logged out at any point — old tokens keep verifying against the old key until they
naturally expire, new tokens verify against the new key, and there's a bounded window (not "forever")
where both are simultaneously valid.

**Where this shows up at scale:** systems using asymmetric signing (`RS256`/`ES256`, section 5) with
multiple independent verifying services typically publish their current public keys at a well-known
**JWKS** (JSON Web Key Set) endpoint (`/.well-known/jwks.json`) — verifiers fetch and cache it, keyed
by `kid`, so a key rotation on the issuing side propagates without every verifying service needing a
manual config update. Not needed for this tutorial's single-service `HS256` setup (section 5) — worth
knowing it exists for the moment you're operating `RS256` across more than one verifying service.

## Checkpoint questions

1. Decode (by hand, using any base64 tool, no library) the payload of a JWT you have access to, and
   explain why doing this does not mean you've "hacked" or weakened the token.
2. Why is trusting the `alg` field written inside an incoming token itself a security bug, even though
   `alg` is a completely legitimate, spec-defined field?
3. You have three backend services — one issues tokens, two only need to verify them. Would you use
   `HS256` or `RS256`, and specifically what goes wrong with `HS256` in this setup that doesn't with
   `RS256`?
4. A token has a valid signature but its `exp` has passed. Is it "valid"? What does "valid" actually
   mean here, precisely?
5. Why does key rotation put `kid` in the JWT **header** rather than the payload/claims?
6. During a key rotation window, both the old and new keys are "acceptable" for verification. Explain
   why this is safe — what stops an attacker from exploiting the fact that two keys work at once?
