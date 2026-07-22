# Module 12 — Assignment: Build It Yourself

Module 11 showed a full build. This module asks for a **different** app, with new requirements — the
point is to apply the reasoning, not recall the snippet. No code is provided here; the assignment is
under-specified on purpose, especially the stretch goals. If something is ambiguous, make and justify
a decision — that judgment call *is* the exercise.

## The app: "BookShelf"

A small API for a personal library: users track books they own and have read.

## Core requirements

1. **Registration & login** — hash passwords correctly (Module 1), issue a JWT access token and an
   opaque refresh token, both delivered as cookies with the correct attributes (Module 3, Module 6).
2. **Public and protected routes** — at least one route reachable with no auth (e.g. browsing a public
   reading list, if you add one) and at least one requiring authentication, with correct default-deny
   configuration (Module 8).
3. **RBAC** — add a `role` (`MEMBER` / `LIBRARIAN`). Gate at least one route (e.g. deleting *any* book,
   not just your own) to `LIBRARIAN` only, both at the URL level and via `@PreAuthorize` on at least
   one method (Module 9). Get the `ROLE_` prefix convention right on both the token-building side and
   the check side.
4. **Refresh rotation with reuse detection** — every refresh issues a new refresh token and invalidates
   the old one; reusing an already-rotated token must be treated as a compromise signal, not a quiet
   401 (Module 5, Module 7).
5. **Correct logout** — revokes the server-side refresh record and clears cookies with matching
   `Path` (Module 7, section 4).

## Stretch goals (deliberately under-specified)

Neither of these is covered verbatim in any earlier module — you'll need to combine ideas from more
than one.

**A. Per-device session management.** Support "log out of just this one device" while other devices
stay logged in. This requires moving off a single-refresh-token-per-user design (if that's what you
built for requirement 4) to a per-device record — think back to Module 5, section 7, on why one row
per issued token is what makes this possible, and design the schema and the "list my active sessions" /
"revoke this one" endpoints yourself.

**B. Login lockout.** Lock an account for 5 minutes after 5 failed login attempts within a 15-minute
window. Decide for yourself: do you key the counter by account, by IP, or both (each has a different
failure mode — an attacker can target one account from many IPs, or spray many accounts from one IP)?
Where does the counter live, and does it need to survive a server restart? What should the login
endpoint return while locked out, and should that response look any different from a normal
"wrong password" response (think about what an attacker learns from the difference)?

## How to self-check your work

For each requirement, you should be able to answer, unprompted, in the tutorial's own vocabulary:

- Which specific attribute on which cookie prevents which specific attack?
- What happens, precisely, if an attacker captures a network request containing your refresh token
  cookie and replays it after the legitimate user has already refreshed once?
- If you promote a `MEMBER` to `LIBRARIAN`, when does that change actually take effect for them, and
  why?
- What does your API return, and to whom, when: (a) no token is present, (b) an expired token is
  present, (c) a valid token for a `MEMBER` hits a `LIBRARIAN`-only route?

If you can answer all of these about your *own* code without re-reading this tutorial, the tutorial
did its job.
