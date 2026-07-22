# Module 9 — RBAC, Kept Simple

Role-Based Access Control: gating actions by a coarse role (`USER`, `ADMIN`, ...) rather than
individual fine-grained permissions. Simple, and enough for most applications until you outgrow it.

## Quick reference: What / Why / How / When

| Concept | What | Why | How | When |
|---|---|---|---|---|
| **Role** | A coarse label on a user (`USER`, `ADMIN`) | Simple, cheap way to gate broad capability differences | Field on the user, embedded as a JWT claim at issuance | Few, clearly distinct user types |
| **`GrantedAuthority` / `hasRole`** | Spring's representation of "what this principal can do" | The actual enforcement mechanism | `hasRole("X")` expects authority `ROLE_X` exactly | URL-level, coarse route gating |
| **`@PreAuthorize` (method-level)** | Per-method authorization check | Can inspect the specific resource/arguments, not just the URL shape | `@EnableMethodSecurity` + annotation on the method | Rules that depend on *which* resource, not just *which* route |
| **Permission-based (future direction)** | Fine-grained capabilities, not one flat role | Scales past "a role for every combination" | Role-permission join table | Many independent capabilities, many role combinations |

## 1. Roles vs permissions — naming the boundary deliberately

RBAC assigns a **role** to a user, and rules check the role. A more granular alternative,
**permission-based access control**, assigns individual permissions (`tasks:delete`, `users:invite`,
...) directly or via a role-permission join table, so you can compose fine-grained access without a
new role for every combination. RBAC is simpler to reason about and implement; permission-based scales
better once you have many independent capabilities and many role combinations. This module builds
RBAC — know that the permission-based extension exists for when a flat role stops being enough (e.g.
"this role can view tasks but not delete them" starting to multiply into dozens of near-duplicate
roles is the signal you've outgrown RBAC).

## 2. The simple model

Add a `role` field to the user:

```java
public enum Role { USER, ADMIN }

@Document(collection = "users")
public class User {
    // ...
    private Role role;
}
```

Embed it as a claim in the access token at issuance time (Module 6's `TokenService`), so authorization
checks need **no extra DB lookup** — the role travels with the already-verified token:

```java
public String generateAccessToken(User user) {
    return Jwts.builder()
            .subject(user.getId())
            .claim("email", user.getEmail())
            .claim("role", user.getRole().name())   // <-- new
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + accessTtlMs))
            .signWith(signingKey())
            .compact();
}
```

**Tradeoff to know:** because the role is baked into the token at issuance, a role change (promoting a
user to `ADMIN`) doesn't take effect until their **next** token issuance (next login, or next refresh
— Module 5's short access-token lifetime bounds how long the old role can linger, which is one more
reason to keep access tokens short-lived).

## 3. `GrantedAuthority` and the `ROLE_` prefix — the single most common RBAC bug

Spring Security represents "what this authenticated principal can do" as a collection of
`GrantedAuthority` objects — plain strings, really. There are two ways to check them, and they are
**not** interchangeable:

- `hasRole("ADMIN")` — implicitly expects an authority literally named **`ROLE_ADMIN`** (Spring
  silently prepends `ROLE_` when you use `hasRole`)
- `hasAuthority("ADMIN")` — expects an exact match, `"ADMIN"`, no prefix added

If you build authorities as `"ADMIN"` and check with `hasRole("ADMIN")`, the comparison is actually
`"ADMIN".equals("ROLE_ADMIN")` — false, always — and the user is silently denied everything, in a way
that looks like a correctly-configured, simply-broken system rather than an obvious crash. The reverse
mismatch (authorities built as `"ROLE_ADMIN"`, checked with `hasAuthority("ADMIN")`) fails the same
way. **Pick one convention and match it on both sides deliberately** — the convention this module uses
is `ROLE_`-prefixed authorities paired with `hasRole(...)` calls, since that's what `hasRole` assumes
by default.

## 4. Building authorities from the token in the filter

Extend Module 6's `JwtAuthFilter` to read the `role` claim and construct the matching authority:

```java
Claims claims = tokenService.parseAndValidate(token).getPayload();
String role = claims.get("role", String.class);

var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
var auth = new UsernamePasswordAuthenticationToken(claims.getSubject(), null, authorities);
SecurityContextHolder.getContext().setAuthentication(auth);
```

## 5. URL-based gating

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .anyRequest().authenticated()
)
```

## 6. Method-level gating

Mechanically different from section 5's URL-based gating, not just a different syntax for the same
check — `@EnableMethodSecurity` wraps the target bean in a proxy and evaluates `@PreAuthorize` via
AOP method interception, *after* Spring MVC has already resolved the method and bound its arguments,
rather than via the filter chain your `JwtAuthFilter` and `authorizeHttpRequests()` run in (Module 6,
Module 8 section 2 covers the filter-vs-AOP distinction in full). Enable it once:

```java
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {}
```

Then annotate individual methods, which composes cleanly with URL-based rules and can express things a
URL pattern can't (a check involving the specific resource, not just the path shape):

```java
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/api/tasks/{id}/force-delete")
public void forceDelete(@PathVariable String id) { ... }
```

## 7. Multiple roles, and where this evolves later

A user with a single `Role` enum field can only ever have one role. If you need "a user who is both a
project owner *and* a team member with different implied permissions in each context," a single enum
stops being enough — that's the point to move to a `Set<Role>` (multiple roles per user) or, further,
to the permission-based model from section 1. Neither is built here; know they're the next step so you
recognize the moment you've outgrown this module's model rather than forcing an increasingly awkward
`if/else` ladder of role checks into staying simple.

## Checkpoint questions

1. A request comes in from a user with authority `ROLE_ADMIN`. Does `.hasRole("ADMIN")` pass? Does
   `.hasAuthority("ADMIN")` pass? Explain both answers precisely.
2. A user is promoted from `USER` to `ADMIN` in the database. Why don't they immediately get admin
   access on their very next request, and what determines how long the delay is?
3. Give a concrete authorization rule that forces you past a single-role-per-user model into either
   multiple roles or permission-based access control.
4. Why is embedding the role in the JWT claim preferable to looking it up from the database on every
   request — and what's the cost of that choice (tie back to section 2's tradeoff)?
