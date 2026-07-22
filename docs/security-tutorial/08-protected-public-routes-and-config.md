# Module 8 — Protected vs Public Routes, and Failure Responses

Route design, and the part beginners skip: what the caller actually *sees* when auth fails.

## 1. Matcher ordering: specific before general

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/refresh").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/tasks/public/**").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")   // Module 9
    .anyRequest().authenticated()
)
```

Spring Security evaluates these **in order, first match wins** — put specific rules before broad ones.
`anyRequest().authenticated()` as the final catch-all gives you **default-deny**: anything you didn't
explicitly `permitAll()` requires authentication, which is the safe default. The common mistake is
building this list default-allow (permit everything, then trying to remember to lock down each new
sensitive endpoint) — new routes silently ship unprotected until someone remembers. Default-deny means
a forgotten route fails *closed*, not open.

## 2. URL-based vs method-level authorization — two different mechanisms, not just two syntaxes

Two places to enforce authorization, and they compose — but it's worth knowing they're built on
genuinely different Spring machinery, not just two ways of writing the same check:

- **URL-based (`authorizeHttpRequests`)** — this is **filter-based** (Module 6): one more entry in
  the same ordered filter chain your `JwtAuthFilter` sits in, evaluated **before the request reaches
  your controller at all**. It only ever sees the request's URL, method, and (by now)
  `SecurityContextHolder` — it has no idea which Java method will eventually handle the request, or
  what arguments it'll be called with. Good for "this whole area of the API requires role X."
- **Method-level (`@PreAuthorize`, Module 9)** — this is **AOP-based** (Aspect-Oriented
  Programming): `@EnableMethodSecurity` causes Spring to wrap the target bean in a dynamic proxy, and
  the `@PreAuthorize` check runs as an interceptor around the *actual Java method call*, after
  Spring MVC has already resolved which controller method to invoke and bound its arguments. That's
  precisely why it can reference method arguments (e.g. "the path variable `id` must match the
  authenticated user's own id") — a URL matcher, evaluated before routing even happens, structurally
  cannot see that far into the request.

**What this means practically — when to reach for which:** URL-based rules for broad strokes
(`/api/admin/**` needs `ADMIN` — a whole area of routes, no per-request data needed to decide).
Method-level for anything that depends on *which specific resource* is being touched (a user editing
*their own* task vs someone else's — URL matching can't see into that, but a
`@PreAuthorize("#id == authentication.name")`-style expression, evaluated after arguments are bound,
can). If you've used Express: URL-based rules are ordinary router-level middleware
(`router.use('/admin', requireAdmin)`); method-level authorization has no direct Express equivalent,
because Express doesn't have an AOP/proxy layer around individual handler functions the way Spring's
bean container does — the closest analogue would be a decorator wrapping one specific handler
function, done manually, rather than a framework-provided mechanism.

## 3. Two distinct failure modes

| | Meaning | HTTP status | Handler |
|---|---|---|---|
| Not authenticated at all | No valid identity was established for this request | 401 Unauthorized | `AuthenticationEntryPoint` |
| Authenticated, but not allowed | We know who you are; you're not permitted to do this | 403 Forbidden | `AccessDeniedHandler` |

These map directly onto Module 0's two separate questions — this is where that split becomes visible
to the *caller*, not just to your own reasoning about the code.

**What these actually are, mechanically:** `AuthenticationEntryPoint` and `AccessDeniedHandler` are
plain functional interfaces (each is a single method you implement, often as a lambda, as below) —
**not** filters or controllers themselves. They're invoked by another filter already built into
Spring Security's chain (`ExceptionTranslationFilter`), which catches the two specific exceptions
(`AuthenticationException`, `AccessDeniedException`) that everything upstream — your `JwtAuthFilter`,
`authorizeHttpRequests()`, `@PreAuthorize` — can throw, and routes each to the right handler. You
never call these interfaces yourself; you only *configure* what they do when Spring Security decides
one of those two failure modes has occurred.

By default, Spring Security's out-of-the-box behavior for these (a redirect to a login page, or a
whitelabel HTML error page) is built for a traditional server-rendered app, not a JSON API. Override
both explicitly:

```java
.exceptionHandling(ex -> ex
    .authenticationEntryPoint((req, res, e) -> {
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json");
        res.getWriter().write("""{"error":"Not authenticated"}""");
    })
    .accessDeniedHandler((req, res, e) -> {
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType("application/json");
        res.getWriter().write("""{"error":"Not authorized"}""");
    })
)
```

Leaving these unset is a common "why does my frontend get an HTML page instead of JSON when auth
fails" bug — the frontend's error handling silently breaks because it's parsing HTML as if it were the
JSON error body it expected.

## Checkpoint questions

1. Explain the difference between a 401 and a 403 using this module's terms, and give one concrete
   request that would trigger each against the matcher list in section 1.
2. Why does matcher *order* matter in `authorizeHttpRequests`, and what would go wrong if
   `/api/admin/**` were listed *after* `anyRequest().authenticated()`?
3. Give a concrete authorization rule that URL-based matching cannot express but `@PreAuthorize` can.
4. Why is default-deny (`anyRequest().authenticated()` as the catch-all) safer than default-allow for
   a growing API?
5. `authorizeHttpRequests` rules and `@PreAuthorize` are both "authorization checks," but they run via
   different Spring mechanisms. Name both mechanisms, and explain why only one of them can see the
   controller method's arguments.
6. Why can't `AuthenticationEntryPoint`/`AccessDeniedHandler` reject a request on their own — what has
   to happen first, further up the chain, before either one is ever invoked?
