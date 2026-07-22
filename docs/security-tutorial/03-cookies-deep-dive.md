# Module 3 — Cookies, Deep Dive

This tutorial standardizes on cookies as the transport for tokens (Modules 6–7 build it that way).
Before writing that code, know exactly what the browser does automatically and what every attribute
buys you — get this wrong and you'll ship something that *looks* secure and isn't.

## Quick reference: What / Why / How / When

| Concept | What | Why | How | When |
|---|---|---|---|---|
| **Cookie** | Server-set data the browser auto-attaches to matching requests | Lets the server "remember" state without client-side code | `Set-Cookie` header out, automatic attachment back in | Same-site or tightly-controlled cross-site auth |
| **`HttpOnly`** | JS can't read the cookie | Blocks XSS from exfiltrating the token | Flag on `Set-Cookie` | Every auth cookie, always |
| **`Secure`** | Cookie only sent over HTTPS | Blocks plain-HTTP interception (MITM) | Flag on `Set-Cookie` | Every auth cookie, always (production) |
| **`SameSite`** | Controls cross-site request attachment | Primary modern CSRF defense | `Lax`/`Strict`/`None` on `Set-Cookie` | `Lax`/`Strict` for same-site apps; `None`+`Secure` only if truly cross-site |
| **`Authorization` header** | Client-attached token, not auto-sent | Immune to CSRF; natural fit for non-browser clients | Client code reads a stored token, sets the header manually | Mobile apps, third-party API consumers, fully decoupled frontends |

## 1. What a cookie actually is

The server sends a `Set-Cookie` response header. The browser stores it, and on every subsequent
request to a URL matching that cookie's `Domain`/`Path`, **attaches it automatically** — no
client-side code needed. This automatic attachment is both the entire convenience of cookies and the
entire reason CSRF exists (section 6).

```
Set-Cookie: accessToken=eyJhbGciOi...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900
```

## 2. Attributes, one by one

| Attribute | What it controls |
|---|---|
| `Domain` | Which host(s) the cookie is sent to. Omitted = current host only (safer default; explicit `Domain` widens the blast radius to subdomains). |
| `Path` | Which URL paths on that domain the cookie is sent to. `Path=/api/auth` means it's *only* attached to requests under `/api/auth`, not the whole site. |
| `Expires` / `Max-Age` | When the cookie is deleted. Omitting both makes it a *session cookie* (deleted when the browser closes) — not the same thing as your application's "session," easy to conflate. |
| `HttpOnly` | JavaScript **cannot** read this cookie via `document.cookie`. See section 3. |
| `Secure` | Cookie is only ever sent over HTTPS. Over plain HTTP, a `Secure` cookie is silently **not sent at all** — a common "why isn't my cookie showing up in dev" gotcha when testing on `http://localhost` without care. |
| `SameSite` | `Strict` / `Lax` / `None` — controls whether the cookie is sent on cross-site requests. See section 6. |

## 3. `HttpOnly` and the XSS threat model

If a token is stored somewhere JavaScript can read it (a plain non-`HttpOnly` cookie, or
`localStorage`), then any successful XSS (cross-site scripting) attack — attacker-controlled
JavaScript running on your page, e.g. via an unsanitized user-generated content field — can simply
read the token and exfiltrate it to the attacker's own server. Game over, indistinguishable from the
real user from then on.

`HttpOnly` closes exactly this hole: the cookie is still sent automatically on requests, but
`document.cookie` in JavaScript never sees it, so an XSS payload has nothing to steal.

**This does not mean XSS stops mattering** — an XSS payload can still make authenticated requests *as
the victim* using their auto-attached cookie (it just can't exfiltrate the token itself for later
reuse). Fixing XSS is still your job (input sanitization, output encoding, CSP); `HttpOnly` limits the
blast radius of a specific *consequence* of XSS, it isn't a fix for XSS.

## 4. The alternative: `Authorization: Bearer <token>` header

Instead of a cookie, the server can hand the client a token that the client stores itself (in memory,
or `localStorage`/`sessionStorage`) and attaches manually on every request:

```
Authorization: Bearer eyJhbGciOi...
```

Nothing is automatic here — the client-side code must read the token and add the header on every
outgoing request itself (an interceptor, typically).

## 5. Cookie vs header — the actual tradeoff

| | Cookie | `Authorization` header |
|---|---|---|
| Attachment | Automatic (browser does it) | Manual (client code does it) |
| XSS exposure | Low, if `HttpOnly` set — JS can't read the token | High if stored in `localStorage`/JS-readable storage — any XSS can steal it outright |
| CSRF exposure | Yes, by default (automatic attachment is the whole problem — see section 6) | No — a malicious page can't make the browser attach a header it doesn't know the value of |
| Cross-domain use (API on a different domain than the frontend) | Needs explicit `SameSite=None; Secure` and CORS `credentials` config | Works naturally — just an HTTP header, no browser cookie jar involved |
| Native mobile apps | Awkward — no browser cookie jar | Natural fit — just attach the header |

Neither option is "more secure" in the abstract — cookies trade CSRF exposure for XSS resistance;
headers trade XSS exposure (if stored badly) for CSRF immunity. Cookies with `HttpOnly` + `Secure` +
`SameSite` are the standard choice for a traditional web app talking to its own same-site (or
tightly-controlled) backend, which is what this tutorial builds. A mobile app or a fully decoupled
third-party API consumer more often reaches for the header instead.

## 6. CSRF, concretely

Say your bank's site trusts a cookie for auth, with no other protection. You're logged in — the cookie
is sitting in your browser. You then visit `evil.example`, which contains:

```html
<form action="https://your-bank.example/transfer" method="POST">
  <input type="hidden" name="to" value="attacker-account">
  <input type="hidden" name="amount" value="10000">
</form>
<script>document.forms[0].submit()</script>
```

Your browser submits this form to `your-bank.example` — and because cookies are attached based on the
**target** domain, not the domain of the page that triggered the request, your real session cookie
gets sent along. The bank's server sees a perfectly well-authenticated request and executes it. This
is CSRF: the attacker never sees or steals your cookie, they just get your browser to use it on their
behalf.

**Defenses:**
- **`SameSite=Lax` (the modern browser default) or `Strict`** — the browser itself refuses to attach
  the cookie on cross-site requests (`Strict`) or on cross-site requests that aren't simple top-level
  navigations (`Lax`). This alone closes most CSRF vectors today.
- **CSRF tokens** — a random value the server issues, the legitimate frontend includes in a
  request body/header (something an attacker's page can't know or forge), the server validates it
  matches before acting. The classic pre-`SameSite` defense, still used defense-in-depth (mechanics in
  section 7 below). Module 6 explains why an API that's stateless, JSON-only, and never relies on the
  cookie *alone* to authorize a state change (it also validates a signed JWT it can't forge) can
  reasonably skip the traditional CSRF-token dance and lean on `SameSite` instead — but that reasoning
  has to be made explicitly, not assumed.
- **Custom-header check** — requiring a header a cross-site `<form>` submission physically cannot set
  (like `X-Requested-With` or a custom app header) works because simple cross-site form submissions
  can't add arbitrary headers, only `fetch`/`XHR` from your *own* origin's JavaScript can.

## 7. CSRF defense mechanics: the double-submit cookie pattern

Naming "CSRF tokens" as a defense (previous section) skips over *how* the server validates one without
needing server-side session storage for it — worth walking through, since "CSRF token" often gets used
as a magic phrase without the mechanism behind it.

1. On a safe request (e.g. loading the page, or a dedicated `/csrf-token` endpoint), the server
   generates a random token and sends it **two ways at once**: as a regular (non-`HttpOnly` — this one
   specifically needs to be JS-readable) cookie, *and* in the response body for the frontend to read.
2. The frontend JavaScript reads the token from the response body (or the readable cookie) and stores
   it, then attaches it as a custom header (e.g. `X-CSRF-Token`) on every subsequent state-changing
   request.
3. The server compares the token in the **header** against the token in the **cookie** on that same
   request. They must match.

**Why this actually defends against CSRF:** the browser auto-attaches the cookie on a forged
cross-site request (that part of CSRF still happens), but a malicious page has no way to read the
cookie's value (it's a different origin — the browser's same-origin policy blocks that read) and so
cannot construct the matching header. The forged request arrives with the cookie but *without* a
correct header, and the mismatch check rejects it. No server-side token storage is needed — the
server only ever compares two values already present on the incoming request.

**Contrast with `SameSite`:** `SameSite` prevents the cookie from being *attached* to a cross-site
request in the first place, closing the hole earlier and more broadly. The double-submit pattern
instead lets the cookie attach but makes the attacker unable to *complete* the forged request
correctly. They're not mutually exclusive — many production setups layer both.

## 8. Same-origin vs. same-site — a precise distinction worth getting right

These sound interchangeable and aren't; `SameSite` cookie behavior and CORS's origin checks use
**different** definitions, and the gap between them is a real source of confusion.

- **Origin** = scheme + host + port, exactly. `https://app.example.com` and
  `https://api.example.com` are **different origins** (different host) — this is what CORS's
  `Access-Control-Allow-Origin` checks against, and what the browser's same-origin policy (the thing
  that stops a malicious page from reading another origin's cookies or response bodies via JS,
  underpinning section 7's defense) enforces.
- **Site** = registrable domain, roughly "the part you'd buy from a registrar" (`example.com`) plus
  scheme, **ignoring subdomain and port**. `https://app.example.com` and `https://api.example.com`
  are **the same site** (both under `example.com`) even though they're different origins — this is
  what `SameSite` cookie attributes check against.

**Concrete consequence:** a cookie set with `SameSite=Lax` or `Strict` from `api.example.com` *will*
be attached to a request initiated from `app.example.com` — they're the same site — even though
they're different origins and a naive CORS check would treat them as unrelated. This is normal and
expected for a typical frontend-on-a-subdomain / API-on-a-subdomain split, but it's worth knowing
precisely why: `SameSite` is deliberately more permissive (subdomain-inclusive) than same-origin,
because the security property it protects (was this request initiated by a plausibly-related site,
not a totally unrelated attacker domain) is coarser than the one CORS protects (can this specific
origin's JavaScript read this specific response).

## Checkpoint questions

1. Explain precisely why `HttpOnly` defends against XSS-driven token theft but does nothing to stop
   CSRF.
2. Explain precisely why `SameSite=Strict` defends against CSRF but does nothing to stop XSS.
3. You're building a mobile app that talks to your API. Would you reach for cookies or the
   `Authorization` header, and why?
4. Why does testing a `Secure`-flagged cookie against `http://localhost` sometimes "silently fail" in
   a confusing way?
5. In the double-submit cookie pattern, why must the CSRF cookie itself be **readable by JavaScript**
   (i.e. *not* `HttpOnly`), when every auth cookie elsewhere in this tutorial is deliberately
   `HttpOnly`? What would break if the CSRF cookie were `HttpOnly` too?
6. `app.example.com` and `api.example.com` — same origin or different? Same site or different?
   Explain why the two questions have different answers.
