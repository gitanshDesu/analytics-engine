# Module 1 — Foundations: Hashing, Salting, Encoding, Encryption

These four words get used loosely and interchangeably in casual conversation. They are not
interchangeable. Getting this module wrong is the single most common root cause of self-taught auth
code being insecure, so read it slowly even though it feels like the "easy" module.

## Quick reference: What / Why / How / When

| Concept | What | Why | How | When to use |
|---|---|---|---|---|
| **Hashing** | One-way, fixed-size, deterministic transform | Verify a secret without ever storing/reading it back | `hash(input)` → compare outputs | Password storage, integrity checks |
| **Salting** | Random per-record value mixed into the hash input | Defeats rainbow tables, hides identical passwords | `hash(input + salt)`, salt stored alongside (not secret) | Always, whenever hashing passwords |
| **Peppering** | Secret, app-wide value mixed into the hash input | Defense in depth beyond salt — DB leak alone isn't enough | `hash(input + salt + pepper)`, pepper stored *outside* the DB | Optional, higher-security contexts |
| **Encoding** | Reversible format change, no secret | Safe transport/storage of data in a given format | Base64, URL-encoding — anyone can reverse it | JWT segments, binary-in-text transport — never for secrecy |
| **Encryption** | Reversible, only with the correct key | Keep data confidential from anyone without the key | AES/RSA, key required to decrypt | Data that must be read back later, only by authorized holders |
| **HMAC** | Fast, keyed hash | Prove integrity + authenticity, not secrecy | `HMAC(secret, message)`, recomputed and compared | Signing JWTs, verifying webhook payloads |

## 1. Encoding vs encryption vs hashing

| | Reversible? | Needs a key/secret? | Purpose | Example |
|---|---|---|---|---|
| **Encoding** | Yes, trivially, by anyone | No | Represent data in a different format for transport/storage | Base64, URL-encoding |
| **Encryption** | Yes, but only with the correct key | Yes | Keep data confidential; only key-holders can read it | AES, RSA |
| **Hashing** | **No** — one-way, by design | No (plain hash) or yes (HMAC) | Prove data wasn't tampered with, or verify a secret without storing it | SHA-256, bcrypt |

The confusion that causes real bugs: **Base64 is not encryption.** A JWT's payload is base64url
*encoded*, not encrypted — anyone can decode it in one line of code, with no key. If you find yourself
thinking "it's fine, it's encoded" about something that must stay confidential, that's the bug. Encode
for transport, encrypt for confidentiality, hash for integrity/verification.

## 2. What hashing actually is

A hash function takes input of any size and produces a **fixed-size**, **deterministic** output (the
same input always produces the same output), with the **avalanche effect**: changing one bit of the
input changes roughly half the output bits, unpredictably. Critically, it is **one-way** — from the
output alone, you cannot recover the input; you can only guess inputs and check if they hash to the
same output.

This one-way property is exactly what makes hashing useful for passwords: the server never needs to
know your actual password, only whether the password you just typed hashes to the same value stored
from when you set it.

## 3. Why plaintext password storage is catastrophic

If the database is ever read by an attacker — breach, misconfigured backup, insider — plaintext
passwords are immediately usable, and because people reuse passwords across sites, the blast radius
extends to every other account those users have. This is not a hypothetical; it is the majority
root cause behind large-scale credential-stuffing attacks reported publicly year after year. There is
never a legitimate reason to store a password in a form the server itself can read back.

## 4. Why *general-purpose fast* hashes are the wrong tool for passwords

SHA-256 is a fine hash function — but it's *fast*, deliberately, because it's designed for things like
verifying file integrity where you want to hash gigabytes quickly. Speed is exactly the wrong property
for password storage: an attacker with a stolen hash can try billions of guesses per second on
consumer GPU hardware against a fast hash. Given how few and how guessable most human-chosen passwords
actually are, a fast hash gives almost no real protection once the hash leaks.

Purpose-built password hashing functions — **bcrypt**, **scrypt**, **Argon2** — are deliberately slow,
and that slowness is *tunable* (a "work factor" or "cost factor"): as hardware gets faster, you
increase the cost factor so guessing stays expensive. This is the whole design goal: make one
correct-password check cheap enough to be invisible to a real user (tens of milliseconds) while making
a billion-guess brute force take years instead of minutes.

**Rule: hash passwords with bcrypt/scrypt/Argon2, never with MD5/SHA-1/SHA-256 alone.**

## 5. Salt

A **salt** is a random value, unique per record, mixed into the input before hashing:
`hash(password + salt)`. It solves two problems a plain hash doesn't:

- **Defeats rainbow tables** — precomputed tables mapping common passwords to their hash, built once
  and reused against any leaked hash database. A unique salt per user means there's no single
  precomputed table that works against more than one hash.
- **Hides "these two users have the same password"** — without a salt, two users with password
  `"password123"` would have identical hashes, which itself leaks information. With a per-user salt,
  their hashes differ even though the password is the same.

In practice, you rarely generate or store the salt yourself — libraries like bcrypt generate a random
salt automatically and pack it into the output hash string itself, so verification just needs the
stored hash, nothing else.

## 6. Pepper (brief)

A **pepper** is a secret value, *not* per-user (one value, application-wide), combined with the
password before hashing, but stored **separately from the database** — typically in application
config/secret manager rather than alongside the password hashes. If the database leaks but the pepper
doesn't, the stolen hashes are useless even with unlimited compute. It's defense in depth on top of
salting, not a replacement for it — and it's optional; most applications ship securely with salting
alone plus a strong password hash.

## 7. HMAC — a different tool for a different job

**HMAC** (Hash-based Message Authentication Code) is a *keyed* hash: `HMAC(secret, message)`. Unlike
password hashing, the goal here is **not** to be slow — it's to be fast, deterministic, and prove two
things at once: the message wasn't tampered with (integrity) and it was produced by someone holding
the secret (authenticity). This is exactly the mechanism that signs a JWT (Module 4) — the server
computes `HMAC(secret, header + payload)` and compares it to the signature on any token it's asked to
trust.

Don't reach for bcrypt to sign a token, and don't reach for HMAC to store a password — they solve
different problems and their design goals (slow-and-brute-force-resistant vs fast-and-verifiable) are
close to opposites.

## Checkpoint questions

1. Why is `SHA-256(password)` alone insecure for storing passwords, but perfectly fine for verifying a
   downloaded file's integrity?
2. What specific attack does a salt defeat that a plain (unsalted) hash doesn't?
3. Why does a JWT's signature use HMAC (fast) instead of bcrypt (slow)? What would break if you used
   bcrypt to sign tokens?
4. True or false: Base64-encoding a password before storing it in the database makes it "hashed."
   Justify your answer.
