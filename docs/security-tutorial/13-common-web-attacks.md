# Module 13 — Common Web Attacks: XSS, CSRF, and More

Earlier modules mentioned XSS and CSRF in passing wherever they were directly relevant (Module 3's
cookie attributes, Module 6's `csrf().disable()` justification). This module collects the full attack
catalog in one place, each explained the same way — **What** it is, **Why** it works /matters, **How**
it's carried out, **When** you're exposed and what defends against it — so you have a single reference
to reason from when you hit something unfamiliar later, rather than needing to recall which earlier
module mentioned it. Read this after Module 3 at the earliest (it assumes cookie/CSRF vocabulary from
there) — it can otherwise be read any time before Module 14.

---

## 1. XSS — Cross-Site Scripting

- **What:** an attacker gets their own JavaScript to execute in your page, in your victim's browser,
  under your origin.
- **Why it matters:** script running under your origin has the same access your own legitimate code
  has — it can read the DOM, make authenticated requests using ambient cookies, read anything JS is
  allowed to read (`document.cookie` for non-`HttpOnly` cookies, `localStorage`, form inputs as the
  user types them).
- **How it's carried out:** three variants —
  - **Stored XSS** — malicious input (a comment, a profile field, anything user-generated) gets saved
    server-side and later rendered back into a page *unescaped*, executing for every visitor who views
    it.
  - **Reflected XSS** — malicious input in a URL/query param is echoed back into the response
    (an error message showing "you searched for: `<script>...`") without escaping, executing
    immediately for whoever clicks a crafted link.
  - **DOM-based XSS** — the vulnerability is entirely client-side: JavaScript takes some
    attacker-influenced value (`location.hash`, a URL param) and writes it into the DOM via an unsafe
    sink (`innerHTML`, `document.write`) without a server round-trip at all.
- **When you're exposed / defenses:**
  - Escape/encode all user-generated content before rendering it as HTML — most modern frontend
    frameworks (React, Vue) escape by default; the danger is explicit escape hatches
    (`dangerouslySetInnerHTML`, `v-html`, raw `innerHTML`) used on anything user-controlled.
  - `HttpOnly` cookies (Module 3) don't stop XSS from happening, but stop it from being able to
    *exfiltrate the token* for later reuse — it limits one specific consequence, not the vulnerability
    itself.
  - A `Content-Security-Policy` header (Module 10) restricts what an injected script can even load or
    execute, real defense in depth on top of fixing the injection point.
  - Never build HTML by string-concatenating unescaped user input, on server or client.

## 2. CSRF — Cross-Site Request Forgery

- **What:** an attacker gets your browser to send a request to *your* site, carrying *your* real
  credentials, without you intending it — fully covered mechanically in Module 3, section 6; summarized
  here for completeness.
- **Why it matters:** the attacker never needs to see or steal anything — they just need your browser
  to make one request while you're authenticated, which happens automatically with cookie-based auth.
- **How it's carried out:** a page you visit (unrelated to your target site) auto-submits a form or
  fires a request at the target site; the browser attaches the target site's cookies because
  attachment is based on the request's *destination*, not the page that triggered it.
- **When you're exposed / defenses:** relevant specifically to **cookie-based** auth (a manually
  attached `Authorization` header, Module 3 section 4, is immune — an attacker's page can't set a
  header value it doesn't know). Defenses: `SameSite=Lax`/`Strict` cookies, CSRF tokens, requiring a
  custom header a cross-site form can't add. Module 6's `csrf().disable()` is safe specifically because
  every mutating request also carries a JWT the server verifies independently of the cookie's mere
  presence — re-verify that assumption still holds any time you add a new mutating endpoint.

## 3. SQL Injection (and injection attacks generally)

- **What:** attacker-supplied input is concatenated directly into a query/command string, letting the
  attacker inject their own logic into it.
- **Why it matters:** full read/write access to the database, authentication bypass (`' OR '1'='1`
  style payloads defeating a login check built as string-concatenated SQL), or worse, depending on
  DB permissions.
- **How it's carried out:** any input field, header, or cookie value that flows unescaped into a query.
  Classic example: `"SELECT * FROM users WHERE email = '" + input + "'"` — an input of
  `x' OR '1'='1` turns the WHERE clause into something that matches every row.
- **When you're exposed / defenses:** **always use parameterized queries / prepared statements**
  (Spring Data JPA and Spring Data MongoDB do this by default when you use their query methods/
  `@Query` with named parameters — the danger is dropping to raw string-built queries). Never build a
  query by concatenating request input into a query string, ever, for any reason. NoSQL databases have
  an analogous risk (operator injection — attacker-supplied JSON containing MongoDB operators like
  `$gt` in a field expected to be a plain string) — validate/type input, don't just trust "it's NoSQL so
  SQL injection doesn't apply," the *category* of bug (unsanitized input reaching a query engine) still
  does.

## 4. Session Hijacking and Session Fixation

- **What:** two related but distinct attacks on session/token *identifiers* themselves.
  - **Hijacking** — attacker obtains a *valid, already-authenticated* session id/token (theft via XSS,
    network sniffing, a leaked log) and uses it directly.
  - **Fixation** — attacker gets the victim to authenticate *using a session id the attacker already
    knows* (e.g. by setting it before login, if the app doesn't rotate the id on login), so the
    attacker's known id becomes valid the moment the victim logs in.
- **Why it matters:** either gives the attacker a fully authenticated session with no need to know the
  victim's password at all.
- **How it's carried out:** hijacking via any of the token-theft vectors already covered (XSS, MITM,
  log leakage); fixation specifically requires the app to accept and continue using a pre-existing
  session id across the login boundary instead of issuing a fresh one.
- **When you're exposed / defenses:** always issue a **new** session id / token pair on login, never
  reuse one that existed pre-authentication (this tutorial's design already does this — Module 5's
  `issueTokens()` always mints fresh tokens). `HttpOnly`+`Secure` cookies and HTTPS everywhere close
  most of hijacking's theft vectors (Module 3, Module 10). Short access-token lifetimes (Module 5)
  bound how long a hijacked *access* token stays useful even if theft does occur.

## 5. Replay Attacks

- **What:** a captured, entirely legitimate request (or token) is resent later by an attacker, as-is.
- **Why it matters:** doesn't require breaking any cryptography — the captured artifact is genuinely
  valid, the attack is just reusing it outside its intended single use.
- **How it's carried out:** network interception (mitigated by HTTPS, see below), or simply a leaked
  log/history containing a token or a full request.
- **When you're exposed / defenses:** short token lifetimes shrink the replay window (Module 5).
  Refresh token **rotation with reuse detection** (Module 5, section 6) is a direct, purpose-built
  defense against replaying a *refresh* token specifically. For one-time-use operations generally, a
  **nonce** (Module 10's glossary) — a value the server only accepts once — is the general-purpose
  fix.

## 6. Man-in-the-Middle (MITM)

- **What:** an attacker positioned on the network path between client and server reads and/or modifies
  traffic in transit.
- **Why it matters:** without transport encryption, every credential, token, and cookie is plainly
  readable as it crosses the network — the theft vector all the other defenses assume isn't happening.
- **How it's carried out:** unsecured public Wi-Fi, a compromised router, DNS spoofing directing
  traffic through an attacker-controlled host, a stripped/downgraded connection (HTTP instead of the
  HTTPS you intended).
- **When you're exposed / defenses:** **HTTPS everywhere, no exceptions** (Module 10) — this single
  control is what every other defense in this tutorial implicitly assumes is already in place; a
  `Secure` cookie flag and a signed JWT both still assume the *connection itself* isn't compromised.
  HSTS (Module 10) closes the specific gap where a first request over plain HTTP, before any redirect
  fires, could be intercepted.

## 7. Brute Force and Credential Stuffing

- **What:** repeatedly guessing credentials — **brute force** tries many passwords against one
  account; **credential stuffing** tries password/email pairs leaked from *other* breaches against
  your login, betting on password reuse.
- **Why it matters:** works purely on volume — no vulnerability in your code required, just an
  unthrottled login endpoint and (for stuffing) the fact that people reuse passwords (Module 1, section
  3's exact point about why plaintext leaks elsewhere become your problem too).
- **How it's carried out:** automated scripts hammering `/login` with candidate credentials.
- **When you're exposed / defenses:** rate limiting and account lockout after N failed attempts
  (Module 10, and Module 12's assignment builds this) — the only real mitigation, since the credentials
  being tried may be entirely "valid-looking" requests individually. CAPTCHAs and requiring MFA for
  sensitive accounts are additional layers beyond this tutorial's scope.

## 8. Clickjacking

- **What:** your legitimate page is loaded in an invisible `<iframe>` on an attacker's page, styled so
  the victim thinks they're clicking something else while actually clicking a button on your (real,
  authenticated) page underneath.
- **Why it matters:** tricks an authenticated user into performing a real action (a click that, say,
  changes a setting or confirms a transfer) without realizing what they clicked.
- **How it's carried out:** `<iframe src="https://your-site.example/dangerous-action">`, made invisible
  or disguised via CSS, overlaid on attacker-controlled decoy content.
- **When you're exposed / defenses:** the `X-Frame-Options` header (or the modern
  `Content-Security-Policy: frame-ancestors` directive) tells browsers to refuse to render your page
  inside a frame on another origin at all — cheap, effective, and unrelated to any of the token/cookie
  machinery elsewhere in this tutorial.

## 9. Broken Access Control / IDOR (Insecure Direct Object Reference)

- **What:** the system correctly authenticates *who* you are, but fails to check whether you're
  *authorized* for the specific resource you're requesting — this is Module 0's original bug, and
  Module 11's fix (`task.setOwnerId(userId)` from the authenticated principal, not client input),
  named and generalized.
- **Why it matters:** it's routinely the most common real-world vulnerability class in audited web
  apps — often simpler to exploit than anything cryptographic, since it just requires changing an id
  in a URL or body and seeing if the server checks ownership.
- **How it's carried out:** an authenticated (even correctly-authenticated) user changes a resource id
  in the request (`/api/tasks/12345` → `/api/tasks/12346`) and the server fetches/mutates it without
  checking that the id belongs to the requester.
- **When you're exposed / defenses:** every handler that reads or mutates a specific resource by id
  must check ownership/permission against the *authenticated* identity, not just confirm *a* valid
  identity exists. This is authorization, not authentication (Module 0) — and it's exactly what
  Module 9's method-level `@PreAuthorize` is suited for when the check depends on the specific resource
  rather than the URL shape alone.

## Checkpoint questions

1. Which attacks in this module are defeated by `HttpOnly`? Which are defeated by `SameSite`? Name at
   least one attack that neither defends against, and what does defend against it instead.
2. Explain why credential stuffing succeeds even against a system with no bugs in its own code.
3. A login form is vulnerable to SQL injection via string-concatenated queries. Is `HttpOnly` or
   `Secure` on the session cookie relevant to fixing this? Why or why not?
4. Give a request that would succeed against a system with broken access control (IDOR) but would be
   rejected by a system that also has correct authorization checks, even though both systems have
   identical, correctly-working authentication.
