# Module 6 — Building It: Spring Security + JWT + Cookies, From Scratch

Hands-on module. Everything below is wired by hand for "TaskFlow," a generic task-list API — no
copy-pasted boilerplate, every line explained.

## 1. Dependencies

```gradle
implementation 'org.springframework.boot:spring-boot-starter-web'
implementation 'org.springframework.boot:spring-boot-starter-security'
implementation 'io.jsonwebtoken:jjwt-api:0.12.6'
runtimeOnly    'io.jsonwebtoken:jjwt-impl:0.12.6'
runtimeOnly    'io.jsonwebtoken:jjwt-jackson:0.12.6'
```

`spring-boot-starter-security`, on its own, locks down every endpoint with a generated password and
basic auth by default — expected, and about to be replaced entirely below.

## 2. `PasswordEncoder` bean

```java
@Configuration
public class PasswordConfig {
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // Module 1: slow, tunable, purpose-built for passwords
    }
}
```

Inject this wherever passwords are hashed (registration) or checked (login) — never hash or compare
manually.

## 3. Issuing and reading JWTs

```java
@Service
public class TokenService {

    @Value("${jwt.secret}")           private String secret;          // Base64-encoded, from env/config, never hardcoded
    @Value("${jwt.access-ttl-ms}")    private long accessTtlMs;

    public String generateAccessToken(User user) {
        return Jwts.builder()
                .subject(user.getId())
                .claim("email", user.getEmail())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTtlMs))
                .signWith(signingKey())
                .compact();
    }

    public Jws<Claims> parseAndValidate(String token) {
        return Jwts.parser().verifyWith(signingKey()).build().parseSignedClaims(token);
        // throws JwtException on bad signature, expired token, malformed token — catch this, don't let it 500
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }
}
```

## 4. Writing the cookie correctly

**Gotcha to know up front:** plain `jakarta.servlet.http.Cookie` has weak, version-dependent support
for `SameSite` — don't fight it. Use Spring's `ResponseCookie` builder, which supports every attribute
from Module 3 explicitly:

```java
ResponseCookie cookie = ResponseCookie.from("accessToken", accessToken)
        .httpOnly(true)
        .secure(true)
        .sameSite("Lax")
        .path("/")
        .maxAge(Duration.ofMinutes(15))
        .build();
response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
```

## 5. The authentication filter — what it is, why it exists, and the middleware analogy

**What a `Filter` actually is:** `Filter` is not a Spring invention — it's part of the Java **Servlet
API** itself (`jakarta.servlet.Filter`), the same spec that defines `HttpServletRequest` and
`HttpServletResponse`. A filter sits in front of your servlet (in a Spring Boot app, that's the
`DispatcherServlet` which routes to your `@RestController` methods) and gets a chance to inspect,
modify, or reject the request/response **before** it reaches the servlet, and again on the way back
out. Spring Security's entire security model is built as one ordered chain of these filters: Spring
Boot registers a single real `Filter` (`FilterChainProxy`) with the servlet container, which
internally delegates, in order, to the list of security filters your `SecurityFilterChain` bean
declares (section 6 below).

**Why a filter specifically, and not, say, an annotation on each controller method:**
authentication has to happen for (almost) every request, *before* Spring even decides which
controller method will handle it — there's no per-handler opt-in step to forget. A filter is the one
part of the pipeline that runs unconditionally, early enough that nothing about routing or controller
resolution has happened yet, which makes it the correct layer for "figure out who this request is
from" before any business logic runs at all.

**The middleware analogy, if you've written Express/Node.js:** this is the *exact same pattern* as
`app.use((req, res, next) => { ... next(); })` — an ordered stack of functions, each given the
request/response and a way to hand control to the next one (`next()` in Express,
`chain.doFilter(request, response)` in a Servlet `Filter`). "Auth middleware" in an Express app and a
Spring Security `Filter` solve the identical problem with the identical shape; Java's version just
predates Express by roughly a decade and is class-based (a `doFilter` method) instead of a bare
function. If you've written `if (!req.user) return res.status(401).json(...)` in Express middleware,
`JwtAuthFilter.doFilterInternal()` below is the same idea — it just populates
`SecurityContextHolder` instead of `req.user`, and (per the note after the code) deliberately doesn't
even do the `res.status(401)` part itself, for reasons specific to how Spring Security splits the job.

**Why `OncePerRequestFilter` specifically, not the plain `Filter` interface:** the Servlet spec allows
a single incoming HTTP request to be internally forwarded or included more than once inside the
container (error-page dispatch, `RequestDispatcher.forward()`) — a plain `Filter` could, in those
cases, run more than once for what is logically one request. `OncePerRequestFilter` is Spring's own
base class (not part of the Servlet spec itself) that guarantees `doFilterInternal()` runs **exactly
once** per request no matter how many internal dispatches occur — the safe default any time a filter
does something stateful, like setting `SecurityContextHolder`, that would misbehave if triggered
twice.

**When you write a custom filter vs. when you don't:** Spring Security already ships filters for the
standard mechanisms — form login, HTTP Basic, OAuth2 login each have their own built-in filter,
turned on declaratively through the `HttpSecurity` DSL (`formLogin()`, `httpBasic()`,
`oauth2Login()`) without writing a line of filter code. You reach for a custom filter specifically
when the authentication mechanism you need isn't one Spring ships out of the box — JWT read from a
cookie is exactly that case, which is the entire reason `JwtAuthFilter` exists here rather than a
built-in being configured instead.

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Autowired private TokenService tokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String token = readCookie(req, "accessToken");

        if (token != null) {
            try {
                Claims claims = tokenService.parseAndValidate(token).getPayload();
                var auth = new UsernamePasswordAuthenticationToken(
                        claims.getSubject(), null, List.of()); // authorities filled in Module 9 for RBAC
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (JwtException e) {
                // invalid/expired token: leave SecurityContext empty, do NOT throw here —
                // let authorizeHttpRequests() decide whether this route requires auth at all
            }
        }
        chain.doFilter(req, res);
    }

    private String readCookie(HttpServletRequest req, String name) {
        if (req.getCookies() == null) return null;
        return Arrays.stream(req.getCookies())
                .filter(c -> c.getName().equals(name))
                .map(Cookie::getValue)
                .findFirst().orElse(null);
    }
}
```

**Why the filter doesn't reject the request itself:** this is the two-stage design worth internalizing
— the filter's only job is to *authenticate* (populate `SecurityContextHolder` if a valid token is
present). Whether the request is actually *allowed* to proceed is a separate decision, made next by
`authorizeHttpRequests()` (Module 8). A public route with no token should still succeed; only
`authorizeHttpRequests()` knows which routes require authentication at all. In the Express-middleware
analogy: this filter is deliberately *not* the middleware that does `return res.status(401)` — it's
closer to a middleware that only ever does `req.user = decodedUser` (or leaves it unset) and always
calls `next()`; a separate, later piece of the chain is what actually enforces "and this route
requires `req.user` to be set."

## 6. `SecurityFilterChain` — assembling the chain, and why order matters

**What `@EnableWebSecurity` and the `SecurityFilterChain` bean actually do:** `@Configuration` is
plain Spring (marks this class as a source of bean definitions, nothing security-specific).
`@EnableWebSecurity` is what turns on Spring Security's web support and wires up the
`FilterChainProxy` from section 5 — without it, the `SecurityFilterChain` bean below would never
actually get registered into the servlet's filter pipeline. The `SecurityFilterChain` bean itself is
where you **declaratively assemble the ordered list of filters** — CORS handling, CSRF, session
policy, your custom `JwtAuthFilter`, and more, all configured through the fluent `HttpSecurity` DSL
instead of the old (pre-Spring-Boot, Java-EE-era) approach of hand-registering filters in `web.xml`.

**Why `addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)` matters — filter
*order*, not just filter *presence*:** the security filter chain is itself an ordered list, same as
an Express middleware stack — each filter runs in sequence, and anything running later can rely on
what an earlier filter already did. `UsernamePasswordAuthenticationFilter` is Spring Security's
built-in filter for form-login-style authentication (disabled here via `formLogin().disable()`, but
still a fixed reference point in the chain's default ordering). Placing `jwtAuthFilter` *before* it
guarantees `SecurityContextHolder` is already populated (or deliberately left empty) by the time
later filters — and eventually `authorizeHttpRequests()`'s decision and your controller itself — run.
Get the order wrong (place a filter that depends on authentication *before* the filter that performs
it) and you get the exact class of bug Express developers know as "I put my auth middleware after my
route handler" — the check runs, but too late to matter.

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired private JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable) // justified below
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/refresh").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://your-frontend.example")); // explicit origin(s), never "*"
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(List.of("Content-Type"));
        config.setAllowCredentials(true); // required for cookies to be sent cross-origin at all

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

**Why `csrf().disable()` here is justified, not just convenient:** this API is stateless and
JSON-only — a state-changing request also has to carry a *valid, signed* access token cookie the
server can verify, which a cross-site `<form>` submission (the classic CSRF vector, Module 3) cannot
forge even though it can *attach* the cookie. The disable is safe **specifically because** every
mutating endpoint also checks the JWT, not because "it's an API so CSRF doesn't apply" — that
justification breaks the moment you add any endpoint that trusts the cookie's mere presence without
also validating the token inside it.

**Why `allowCredentials(true)` forces explicit origins:** the CORS spec disallows combining
`Access-Control-Allow-Credentials: true` with a wildcard `Access-Control-Allow-Origin: *` — browsers
will reject it outright. If cookies must cross an origin boundary, you must list real origins.

## 7. The canonical Spring Security architecture — and why this tutorial didn't use it

Everything built above sets `SecurityContextHolder` **directly** inside `JwtAuthFilter`. Most Spring
Security documentation and tutorials instead center on a different, more ceremonial flow — worth
knowing both, because plenty of code you'll read (and some interview questions) assume the canonical
one.

**The canonical flow, piece by piece:**

- **`UserDetails`** — an interface representing "a user, as Spring Security wants to see one"
  (username, password hash, authorities, account-enabled flags). You'd normally adapt your own `User`
  entity to implement this, or wrap it.
- **`UserDetailsService`** — one method, `loadUserByUsername(String)`, that looks up a `UserDetails`
  by identifier (despite the name, "username" is just whatever identifier you use — email works fine).
  This is the extension point where *your* database lookup plugs into Spring Security's machinery.
- **`AuthenticationProvider`** — takes an unauthenticated `Authentication` (e.g. username + raw
  password) and either produces a fully authenticated one or throws. `DaoAuthenticationProvider` is
  the built-in implementation for username/password: it calls your `UserDetailsService`, then checks
  the submitted password against the stored hash using the configured `PasswordEncoder` (section 2) —
  you never call `passwordEncoder.matches()` yourself in this flow, the provider does it for you.
- **`AuthenticationManager`** — the orchestrator; typically delegates to one or more
  `AuthenticationProvider`s (an app can have several, e.g. one for username/password, one for an API
  key) and returns the result of whichever one succeeds.

**Why this tutorial's filter doesn't use any of it:** the canonical flow's entire job is turning
*credentials submitted on this request* (a username and password, most commonly) into an
`Authentication`. But by the time a request reaches `JwtAuthFilter`, no credentials are being
submitted at all — the browser is presenting an *already-issued, pre-verified* token from a *previous*
login. There's no `UserDetailsService` lookup to make, no password to check, nothing for an
`AuthenticationProvider` to provide — the entire question the JWT already answers, cryptographically,
via its signature (Module 4). Manually building the `Authentication` from the token's claims and
setting it directly is not a shortcut around the canonical flow — it's simply a different, and here
correct, part of the picture: **the canonical `AuthenticationManager`/`AuthenticationProvider` flow
is exactly what runs once, at `/login`** (checking the submitted password against the stored hash),
while `JwtAuthFilter` handles every request *after* that, where the "authentication" step is
signature verification, not a credentials lookup.

**Where you'd actually reach for the canonical flow in this tutorial's app:** rewiring the `/login`
endpoint (Module 7) to use an `AuthenticationManager` instead of calling `passwordEncoder.matches()`
directly in `AuthService` — a legitimate refactor, mostly valuable if you later add more credential
types (e.g. an API-key `AuthenticationProvider` alongside password login) and want one consistent
entry point for all of them, rather than a hard requirement for a single-credential-type app like this
one.

## Checkpoint questions

1. Without looking back at the code, list the exact order of operations between a browser sending a
   request with an expired access-token cookie and that request either reaching your controller or
   being rejected.
2. Why does `JwtAuthFilter` swallow `JwtException` instead of immediately returning 401 itself?
3. What specifically breaks if you set `allowedOrigins("*")` together with `allowCredentials(true)`?
4. The `csrf().disable()` justification above depends on every mutating endpoint validating the JWT.
   Describe a hypothetical endpoint that would make this justification unsafe.
5. If you've used Express/Node.js: map `JwtAuthFilter` and `chain.doFilter(req, res)` onto the
   Express middleware pattern you know — what plays the role of `next()`, and what's the Java
   equivalent of `app.use(middleware1, middleware2, ...)` ordering mattering?
6. Why does `OncePerRequestFilter` exist as a separate base class instead of every Spring Security
   filter just implementing the plain Servlet `Filter` interface directly?
7. You need to add Basic Auth support alongside JWT for one legacy internal endpoint. Do you write a
   new custom filter, or configure something already built in? What tells you which?
8. Why doesn't `JwtAuthFilter` need a `UserDetailsService`, when most Spring Security tutorials treat
   it as a required piece? What Spring Security is `UserDetailsService` actually for, precisely?
9. Where in this tutorial's app (if anywhere) would `AuthenticationManager`/`AuthenticationProvider`
   actually be the right tool? What request is being handled at that point that's different from every
   other request `JwtAuthFilter` sees?
