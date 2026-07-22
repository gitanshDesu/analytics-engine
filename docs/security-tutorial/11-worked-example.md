# Module 11 — Worked Example (Full Build)

One continuous build of "TaskFlow," in order, so every earlier module's piece is seen connected
rather than in isolation. This is deliberately the *same* app as Module 6's snippets, assembled end to
end with the pieces Modules 7–9 added.

## Step 1 — `User` entity + password hashing

```java
public enum Role { USER, ADMIN }

@Document(collection = "users")
public class User {
    @Id private String id;
    @Indexed(unique = true) private String email;
    private String passwordHash;
    private Role role = Role.USER;
}
```

```java
@Service
public class UserService {
    @Autowired private UserRepository userRepo;
    @Autowired private PasswordEncoder passwordEncoder;

    public User register(String email, String rawPassword) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword)); // Module 1
        return userRepo.save(user);
    }
}
```

## Step 2 — `refresh_tokens` collection (Module 5)

```java
@Document(collection = "refresh_tokens")
public class RefreshToken {
    @Id private String id;
    private String userId;
    private String tokenHash;      // SHA-256 of the raw opaque token — Module 5, section 5
    private Instant expiresAt;
    private boolean revoked = false;
}
```

## Step 3 — `TokenService`: access token (JWT) + refresh token (opaque)

```java
@Service
public class TokenService {
    @Value("${jwt.secret}") private String secret;
    @Value("${jwt.access-ttl-ms}") private long accessTtlMs;
    @Value("${jwt.refresh-ttl-ms}") private long refreshTtlMs;

    public String generateAccessToken(User user) {
        return Jwts.builder()
                .subject(user.getId())
                .claim("role", user.getRole().name())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTtlMs))
                .signWith(signingKey())
                .compact();
    }

    public String generateRawRefreshToken() {
        return UUID.randomUUID().toString(); // opaque, high-entropy — Module 5
    }

    public String hashRefreshToken(String raw) {
        return Hashing.sha256().hashString(raw, StandardCharsets.UTF_8).toString(); // fast hash is fine here
    }

    public Claims parseAccessToken(String token) {
        return Jwts.parser().verifyWith(signingKey()).build().parseSignedClaims(token).getPayload();
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }
}
```

## Step 4 — `AuthService`: register, login, refresh, logout (Module 7)

```java
@Service
public class AuthService {
    @Autowired private UserRepository userRepo;
    @Autowired private RefreshTokenRepository refreshRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private TokenService tokenService;

    public void register(String email, String rawPassword, HttpServletResponse res) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        userRepo.save(user);
        issueTokens(user, res);
    }

    public void login(String email, String rawPassword, HttpServletResponse res) {
        User user = userRepo.findByEmail(email).orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        issueTokens(user, res);
    }

    public void refresh(HttpServletRequest req, HttpServletResponse res) {
        String raw = readCookie(req, "refreshToken");
        String hash = tokenService.hashRefreshToken(raw);

        RefreshToken stored = refreshRepo.findByTokenHashAndRevokedFalse(hash)
                .orElseThrow(InvalidCredentialsException::new); // covers reuse-of-rotated-token too

        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidCredentialsException();
        }

        stored.setRevoked(true); // rotation: this exact token can never be used again
        refreshRepo.save(stored);

        User user = userRepo.findById(stored.getUserId()).orElseThrow();
        issueTokens(user, res);
    }

    public void logout(HttpServletRequest req, HttpServletResponse res) {
        String raw = readCookie(req, "refreshToken");
        if (raw != null) {
            refreshRepo.findByTokenHashAndRevokedFalse(tokenService.hashRefreshToken(raw))
                    .ifPresent(t -> { t.setRevoked(true); refreshRepo.save(t); });
        }
        clearCookie(res, "accessToken", "/");
        clearCookie(res, "refreshToken", "/api/auth");
    }

    private void issueTokens(User user, HttpServletResponse res) {
        String accessToken = tokenService.generateAccessToken(user);
        String rawRefresh = tokenService.generateRawRefreshToken();

        RefreshToken record = new RefreshToken();
        record.setUserId(user.getId());
        record.setTokenHash(tokenService.hashRefreshToken(rawRefresh));
        record.setExpiresAt(Instant.now().plusMillis(refreshTtlMs));
        refreshRepo.save(record);

        setCookie(res, "accessToken", accessToken, "/", accessTtlSeconds());
        setCookie(res, "refreshToken", rawRefresh, "/api/auth", refreshTtlSeconds());
    }
    // setCookie/clearCookie/readCookie: Module 6/7's ResponseCookie helpers
}
```

## Step 5 — `JwtAuthFilter` + `SecurityConfig` (Module 6, 8, 9)

Unchanged from Modules 6 and 9 — the filter reads the `role` claim and builds a `ROLE_`-prefixed
authority; the config sets `/api/auth/register|login|refresh` public, `/api/admin/**` gated to
`ADMIN`, everything else authenticated.

## Step 6 — Protected and admin-only routes

```java
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    @PostMapping
    public Task create(@AuthenticationPrincipal String userId, @RequestBody Task task) {
        task.setOwnerId(userId); // never trust a client-supplied ownerId — Module 0's original bug
        return taskRepo.save(task);
    }
}

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/tasks")
    public List<Task> allTasks() {
        return taskRepo.findAll();
    }
}
```

Notice `create()` sets `ownerId` from the **authenticated principal**, not from the request body —
this is Module 0's original vulnerability, now actually fixed, not just theoretically discussed.

## Step 7 — Testing what was built

Everything above has been "built"; none of it has been *verified*. Two layers of test are worth
writing, testing different things:

**1. Unit-testing `TokenService` directly** — no Spring context needed, just the plain object:

```java
class TokenServiceTest {
    TokenService tokenService = new TokenService(/* test secret, short TTL */);

    @Test
    void validTokenRoundTrips() {
        User user = new User("u1", "a@b.com", Role.USER);
        String token = tokenService.generateAccessToken(user);
        Claims claims = tokenService.parseAccessToken(token);
        assertEquals("u1", claims.getSubject());
    }

    @Test
    void expiredTokenFailsValidation() {
        // build a TokenService with accessTtlMs = -1000 (already expired) and assert it throws
    }
}
```

This confirms the token machinery itself is correct in isolation — cheap, fast, no HTTP involved.

**2. Integration-testing the actual HTTP + cookie + filter flow with `MockMvc`** — this is the layer
that actually proves `JwtAuthFilter`, `SecurityConfig`'s route rules, and cookie handling work
*together*, which the unit test above can't:

```java
@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowTest {

    @Autowired MockMvc mockMvc;

    @Test
    void loginIssuesCookiesAndProtectedRouteThenWorks() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content("""{"email":"a@b.com","password":"correct-horse"}"""))
            .andExpect(status().isOk())
            .andExpect(cookie().exists("accessToken"))
            .andExpect(cookie().httpOnly("accessToken", true))
            .andReturn();

        Cookie accessToken = loginResult.getResponse().getCookie("accessToken");

        mockMvc.perform(get("/api/tasks").cookie(accessToken))
            .andExpect(status().isOk()); // proves the filter + route rule actually authenticate
    }

    @Test
    void protectedRouteWithNoCookieReturns401() throws Exception {
        mockMvc.perform(get("/api/tasks"))
            .andExpect(status().isUnauthorized()); // proves default-deny (Module 8) actually holds
    }
}
```

**Where `@WithMockUser` fits, and where it doesn't:** `@WithMockUser(roles = "ADMIN")` pre-populates
`SecurityContextHolder` for a test, skipping authentication entirely — perfect for testing
**authorization** logic in isolation (does this `@PreAuthorize`-annotated method correctly reject a
non-admin?) without needing a real token. It's the wrong tool for testing the login/cookie/filter flow
itself, since it bypasses exactly the code path (`JwtAuthFilter`, real cookies) that flow needs to
prove works — use real `MockMvc` requests with real cookies (as above) for that, and `@WithMockUser`
specifically for method-level authorization tests that don't care how the user got authenticated.

## What this build does and doesn't cover

This is the minimum coherent slice: register → login → protected route → refresh → logout → one
RBAC-gated route. It deliberately **doesn't** include rate limiting, account lockout, or multi-device
session listing — those are Module 12's assignment, precisely so you build them yourself rather than
read them here.

## Checkpoint

Trace, in the code above, exactly which line makes each of these true, and be able to point to it:
1. A stolen access token is only useful for a bounded, short window.
2. A stolen refresh token, once used once by an attacker, can't be used again by the legitimate user
   either — describe why this is a *deliberate* tradeoff, not a bug, and what UX consequence it has.
3. Promoting a user to `ADMIN` in the database doesn't grant them admin access until their next login
   or refresh.
4. Why does `@WithMockUser` make a poor substitute for a real `MockMvc` cookie-based request when
   testing whether `JwtAuthFilter` itself works correctly?
5. The unit test for `TokenService` and the `MockMvc` integration test both "test authentication" in
   some sense. What does each one actually prove that the other doesn't?
