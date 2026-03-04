---
date: 2026-03-03T16:42:30Z
type: decision
status: complete
agent: claude-sonnet-4-6
branch: t2
tags: [auth, clerk, lucia, session-management, social-login]
files_modified: []
---

# Switch from Lucia to Clerk for Authentication

## Summary

The project is switching from Lucia Auth to Clerk as the primary authentication solution to reduce manual implementation overhead and improve scalability.

## Context

The project had been using Lucia Auth for handling user authentication. As the application grew and requirements around session management and social logins became more prominent, the team evaluated whether Lucia's manual approach remained appropriate. The overhead of building and maintaining authentication infrastructure that Lucia requires was increasingly becoming a burden, prompting an evaluation of managed authentication services.

## Options Considered

### Option 1: Continue with Lucia Auth

**Pros:**

- Full control over authentication flow and session storage
- No third-party dependency for core auth logic
- Self-hosted, no per-user pricing
- Open source and transparent

**Cons:**

- Requires significant manual implementation of session management (token rotation, expiry, invalidation)
- Social login (OAuth) providers must each be integrated and maintained manually
- Ongoing maintenance burden as security requirements evolve
- More surface area for authentication bugs
- Developer time spent on auth plumbing rather than product features

### Option 2: Switch to Clerk

**Pros:**

- Session management handled out of the box (token rotation, multi-session, device management)
- Social logins (Google, GitHub, Apple, etc.) provided without per-provider manual integration
- Prebuilt UI components for sign-in, sign-up, and user profile flows
- Built-in scalability — Clerk manages infrastructure as user volume grows
- Reduces time spent on auth maintenance, freeing engineers for product work
- Enterprise features (MFA, SSO) available without custom builds

**Cons:**

- Third-party dependency introduces vendor lock-in risk
- Per-user pricing model may become costly at very large scale
- Less control over session storage and token format
- Requires migration of existing users and sessions from Lucia

## Decision

The project will switch to Clerk.

The primary driver is that Lucia required too much manual work — particularly around session management and social login integrations. Clerk handles both of these out of the box, providing a more scalable foundation without the ongoing maintenance cost. The reduction in auth-related engineering effort outweighs the trade-offs of vendor dependency, especially given the project's current growth stage where developer velocity is a priority.

## Consequences

**Trade-offs accepted:**

- Vendor lock-in: The project is now dependent on Clerk's uptime and pricing decisions. A future migration away from Clerk would require significant rework.
- Pricing exposure: At large user volumes, Clerk's per-user pricing may become a concern and would warrant re-evaluation.
- Reduced customization: Some low-level session behaviors that were configurable in Lucia are now controlled by Clerk's platform.

**Risks:**

- Existing Lucia sessions will be invalidated during migration; users will need to re-authenticate.
- Any custom session or token logic built on top of Lucia must be audited and replaced with Clerk's equivalents.

**Triggers for revisiting this decision:**

- Monthly auth costs from Clerk exceed a defined budget threshold.
- Clerk introduces breaking changes or deprecates features the project depends on.
- A business requirement emerges that Clerk cannot support (e.g., fully on-premise auth).
