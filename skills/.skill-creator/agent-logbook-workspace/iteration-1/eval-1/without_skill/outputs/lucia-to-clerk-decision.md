# Decision Record: Switch from Lucia to Clerk for Authentication

**Date:** 2026-03-03
**Status:** Decided
**Deciders:** Engineering Team

---

## Context

The application was previously using Lucia as its authentication library. As the product grows and scalability becomes a higher priority, the team evaluated alternatives to Lucia and decided to migrate to Clerk.

---

## Decision

**We will replace Lucia with Clerk as our authentication provider.**

---

## Reasoning

### Why We Are Moving Away from Lucia

Lucia is a low-level authentication library that provides the building blocks for session management but requires significant manual implementation work. As our application requirements grew, the overhead of maintaining custom authentication logic became a burden:

- **Manual session management:** Lucia requires the developer to implement and manage session creation, validation, expiration, and cleanup explicitly. This is error-prone and requires ongoing maintenance.
- **No built-in social login support:** Adding OAuth providers (Google, GitHub, etc.) with Lucia requires integrating and maintaining third-party OAuth flows manually, including token exchange, profile fetching, and account linking.
- **Security responsibility:** Because Lucia is a library rather than a managed service, the team is responsible for keeping up with security best practices, rotating secrets, and handling edge cases in authentication flows.
- **Scalability concerns:** As the user base grows, session storage, token refresh, and concurrent session handling all require additional infrastructure and custom code to scale correctly.
- **Developer time cost:** The manual work required to keep authentication secure, functional, and feature-complete was diverting engineering effort away from core product features.

### Why We Are Choosing Clerk

Clerk is a managed authentication and user management platform that addresses the pain points above out of the box:

- **Session management handled automatically:** Clerk manages the full session lifecycle — creation, validation, refresh, and expiration — without any custom code required from the team.
- **Social logins out of the box:** Clerk supports a wide range of OAuth providers (Google, GitHub, Apple, etc.) with minimal configuration, eliminating the need to implement OAuth flows manually.
- **Security maintained by Clerk:** As a dedicated authentication provider, Clerk invests heavily in security, compliance (SOC 2), and staying up to date with best practices. The team benefits from this expertise without maintaining it in-house.
- **Scalability:** Clerk is designed to scale to millions of users without requiring the team to manage session storage infrastructure or worry about performance bottlenecks in authentication.
- **Rich UI components:** Clerk provides pre-built, customizable sign-in/sign-up components, reducing frontend implementation time.
- **User management dashboard:** Clerk provides an admin dashboard for managing users, sessions, and organizations, which reduces the need to build internal tooling.
- **Webhooks and events:** Clerk emits webhooks for authentication events, making it easy to sync user data with our backend (e.g., Convex).

---

## Trade-offs

### Advantages of Switching to Clerk

| Area               | Benefit                                          |
| ------------------ | ------------------------------------------------ |
| Session management | Fully managed; no custom code required           |
| Social logins      | Supported out of the box with minimal config     |
| Security           | Maintained by Clerk's dedicated security team    |
| Scalability        | Designed to scale without infrastructure changes |
| Developer velocity | Less boilerplate; faster feature development     |
| User management    | Built-in admin dashboard                         |

### Disadvantages / Costs of Switching to Clerk

| Area                 | Cost                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Vendor dependency    | We are now dependent on Clerk's availability and pricing decisions                                                                          |
| Pricing              | Clerk has a free tier but costs scale with Monthly Active Users (MAUs); at high scale this may become significant                           |
| Customization limits | Some advanced or highly custom authentication flows may be harder to implement within Clerk's constraints compared to building from scratch |
| Migration effort     | Existing user sessions and accounts need to be migrated from Lucia to Clerk, which requires a one-time migration effort                     |
| Data residency       | User authentication data is stored in Clerk's infrastructure, which may be a consideration for compliance requirements                      |
| Lock-in              | Migrating away from Clerk in the future would require re-implementing authentication infrastructure                                         |

---

## What We Lose from Lucia

- Full control over the authentication data model and session storage
- Ability to run authentication entirely on our own infrastructure
- Zero external SaaS dependencies for authentication

---

## Conclusion

The switch from Lucia to Clerk is justified by the significant reduction in manual implementation and maintenance work. Clerk handles session management and social logins out of the box, which were two of the most time-consuming aspects of our Lucia-based authentication. The trade-offs around vendor dependency and pricing are acceptable given our current scale and the engineering time savings. We will revisit this decision if pricing becomes prohibitive at scale or if we encounter significant customization limitations.
