# Module 7 — The Refresh API, End to End

Wiring the four endpoints, and — just as important — the client-side logic that uses them without
racing itself.

## 1. The four endpoints

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private AuthService authService;

    @PostMapping("/register")
    public UserResponse register(@Valid @RequestBody RegisterRequest req, HttpServletResponse res) {
        return authService.register(req, res); // hash password, save user, issue tokens, set cookies
    }

    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest req, HttpServletResponse res) {
        return authService.login(req, res); // verify password hash, issue tokens, set cookies
    }

    @PostMapping("/refresh")
    public UserResponse refresh(HttpServletRequest req, HttpServletResponse res) {
        return authService.refresh(req, res); // Module 5's rotation + reuse-detection logic lives here
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest req, HttpServletResponse res) {
        authService.logout(req, res); // revoke the refresh token record, clear both cookies
    }
}
```

### What each must do, server-side

- **`/register`:** validate input, hash the password (`PasswordEncoder`, Module 1), persist the user,
  then behave exactly like login — issue an access token and a refresh token record, set both cookies.
- **`/login`:** look up the user, verify the submitted password against the stored hash
  (`passwordEncoder.matches(raw, stored)` — never compare hashes yourself, never compare passwords
  with `.equals()` either, Module 10 explains why), then issue tokens.
- **`/refresh`:** read the refresh token cookie, hash it, look up the matching (non-revoked,
  non-expired) record, verify it (Module 5's rotation/reuse-detection logic), issue a **new** access
  token and a **new** refresh token, revoke the old refresh token record.
- **`/logout`:** revoke the refresh token's server-side record (so it can't be replayed even if the
  cookie leaks after this point), then clear both cookies.

## 2. Client-side: the 401-triggers-refresh pattern

```js
async function apiFetch(url, options = {}) {
  let res = await fetch(url, { ...options, credentials: 'include' });

  if (res.status === 401) {
    await ensureFreshAccessToken();          // see below — this is the part that must not race
    res = await fetch(url, { ...options, credentials: 'include' }); // retry once, not in a loop
  }
  return res;
}
```

`credentials: 'include'` is required for cookie-based auth cross-origin — without it, the browser
won't attach or accept the auth cookies at all (ties back to Module 6's `allowCredentials(true)`).

## 3. The race condition, and the fix

If five API calls fire around the same time and the access token has just expired, all five will get
401s and, naively, all five will call `/refresh` simultaneously. Best case this is wasteful (five
refresh calls for one expired token); worst case, if your rotation logic invalidates the old refresh
token the instant the first call uses it (Module 5), the other four refresh attempts fail outright
because the token they're holding was already rotated away — a self-inflicted lockout.

**Fix: a single, shared in-flight refresh promise every caller awaits, instead of each caller
independently triggering its own refresh call:**

```js
let refreshInFlight = null;

function ensureFreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}
```

The first caller to hit a 401 starts the refresh; every other caller that hits a 401 while it's still
in flight awaits the *same* promise instead of starting a second one. This is a general pattern, not
JWT-specific — any time multiple concurrent operations need to trigger the same "recover once, then
let everyone proceed" step, a shared in-flight promise (or a mutex) is the fix.

## 4. Logout cookie-clearing correctness

A cookie set with `Path=/api/auth` can only be **cleared** by a `Set-Cookie` for that same `Path` (and
`Domain`, if one was set). Clearing with a mismatched path silently does nothing — the browser treats
it as a *different* cookie, not an instruction to delete the original one. If Module 6's access-token
cookie used `Path=/` and the refresh-token cookie used `Path=/api/auth` (a sensible split — narrows
which requests carry the more sensitive, longer-lived token), logout must clear each with its
*original* path exactly:

```java
private void clearCookie(HttpServletResponse res, String name, String path) {
    ResponseCookie cookie = ResponseCookie.from(name, "")
            .httpOnly(true).secure(true).path(path).maxAge(0).build();
    res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
}
```

## 5. Input validation as a security boundary, not just correctness

The `@Valid` annotation on `register`/`login` in section 1 has been sitting there unexplained — worth
stopping on, because "validation" tends to get filed under code quality when a meaningful part of it
is actually a security control.

**What it is:** Bean Validation (`jakarta.validation` — `@NotBlank`, `@Email`, `@Size`, `@Pattern`,
etc.) declared on the request DTO's fields:

```java
public class RegisterRequest {
    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 12, max = 128)
    private String password;
}
```

`@Valid` on the controller parameter tells Spring to run these checks **before** the method body
executes at all; a failing check short-circuits straight to a 400 response, your handler code never
runs.

**Why this matters for security, specifically, not just for good error messages:**

- **It's the first line of defense against malformed input reaching anything sensitive** — a
  `password` field with no `@Size` bound could be an empty string (silently hashed and stored as a
  usable "blank password") or a multi-megabyte string handed to bcrypt (Module 1's deliberately slow
  hash function — hashing an attacker-controlled multi-MB string on every login attempt is a cheap
  denial-of-service lever against your own CPU).
- **It shrinks the injection attack surface** (Module 13) before data reaches a query or gets
  persisted at all — not a substitute for parameterized queries, but one more layer, and the cheapest
  one to add.
- **It enforces the same rules the client-side form should already have** — client-side validation is
  a UX nicety an attacker trivially bypasses by calling the API directly; server-side validation is the
  actual boundary, since it's the one point the request must pass through regardless of how it was
  constructed.

**When to reach for it vs. hand-written checks:** Bean Validation annotations for anything expressible
declaratively (required, format, length/range) — a custom `@Valid`-compatible validator or manual
checks in the service layer for anything that needs cross-field logic or a database lookup (e.g.
"email must not already be registered," which can't be a stateless per-field annotation). Validate at
the boundary (the DTO, on the way in) rather than trusting internal code to re-check — internal service
methods should be able to assume a `@Valid`-passed DTO is already well-formed.

## Checkpoint questions

1. Write out, as a numbered client → server → client sequence, everything that happens from "access
   token cookie expired" to "the user's original request finally succeeds."
2. Why does the shared in-flight promise pattern matter *specifically* because of refresh token
   rotation, and not just as a general "avoid duplicate network calls" optimization?
3. You set a cookie with `Path=/api/auth/refresh` (narrower than the login endpoint's cookie, by
   mistake). What breaks, and where would you notice it first?
4. Why must `/logout` revoke the server-side refresh token record, not just clear the cookies? What
   attack does skipping that step leave open?
5. Why is an unbounded (no `@Size` max) password field a real security concern, not just a data-quality
   nitpick, given what Module 1 said about bcrypt's design?
6. Give an example of a validation rule that can't be expressed as a Bean Validation annotation on the
   DTO alone, and explain why.
