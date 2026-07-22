# Spring Boot Security Tutorial — Authentication & Authorization From Zero

A self-contained tutorial on implementing authentication and authorization in Spring Boot, built
around a generic example app ("TaskFlow") rather than this repo's own code — the goal is for the
concepts to transfer to *any* future project, not just to make this repo's auth code legible. The
final module maps everything learned back onto this repo's real `analytics-backend` auth
implementation and explains the choices made there.

Read the modules in order — later modules assume the vocabulary and reasoning from earlier ones,
especially Module 1 (hashing/salting) and Module 2 (authN vs authZ, session vs token), which
everything else is built on.

1. [Motivating example](00-motivating-example.md) — a broken, auth-less API and the two questions
   any fix must answer
2. [Foundations: hashing, salting, encoding, encryption](01-foundations-hashing-salting-encoding.md)
3. [AuthN vs AuthZ, session-based vs token-based auth](02-authn-vs-authz-session-vs-token.md)
4. [Cookies, deep dive](03-cookies-deep-dive.md) — attributes, cookie vs `Authorization` header, CSRF
5. [JWT, deep dive](04-jwt-deep-dive.md) — structure, signing algorithms, the revocation problem
6. [Access tokens, refresh tokens, and server-side persistence](05-access-refresh-tokens-and-persistence.md)
7. [Building it: Spring Security + JWT + cookies, from scratch](06-spring-security-jwt-cookie-setup.md)
8. [The refresh API, end to end](07-refresh-api-logic.md)
9. [Protected vs public routes, and failure responses](08-protected-public-routes-and-config.md)
10. [RBAC, kept simple](09-rbac-basics.md)
11. [Hardening checklist and concept glossary](10-hardening-checklist-and-glossary.md)
12. [Worked example (full build)](11-worked-example.md)
13. [Assignment: build it yourself](12-assignment.md)
14. [Common web attacks: XSS, CSRF, and more](13-common-web-attacks.md) — What/Why/How/When for each
    attack this tutorial's defenses target; readable any time after Module 3
15. [OAuth2 / OpenID Connect: social login and delegated auth](14-oauth2-oidc-social-login.md) —
    "Sign in with Google," and how it connects back to Module 5's token model
16. [Password reset and email verification](15-password-reset-email-verification.md) — the
    single-use-token pattern applied to two flows Modules 6–7 didn't cover
17. [Tying it back to this repo](16-tying-back-to-this-repo.md)

Each module ends with **checkpoint questions** — answer them unaided before moving on. They're the
actual measure of whether the module landed, not the prose above them.

## Not covered in depth

Named here so the tutorial is a complete map of the territory even where it doesn't go deep — reach
for external docs when these come up: **multi-factor authentication (TOTP)**, **API keys /
service-to-service (M2M) authentication**, **CORS preflight (`OPTIONS`) mechanics**, and **security
audit logging** (what to log about auth events, as the positive counterpart to Module 10's "never log
secrets").

See also: [`../security-tutorial-plan.md`](../security-tutorial-plan.md) for the original curriculum
outline this was built from.
