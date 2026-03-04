---
date: 2026-03-03T16:42:21Z
type: activity
status: partial
agent: claude-sonnet-4-6
branch: t2
tags: [auth, tanstack-router, refactor, web, mobile]
files_modified:
  - apps/assistant-web/src/routes/auth.tsx
  - packages/assistant-app/src/hooks/use-auth.ts
---

# Refactor Auth Logic to Use TanStack Router Hooks

## Summary

Refactored the authentication logic in `assistant-web` and the shared `assistant-app` package to use TanStack Router hooks. The web layer is complete; the mobile app still needs to be updated.

## Context

The auth logic was migrated from a custom approach to use TanStack Router hooks for consistency with the routing architecture used across the web application. The shared `use-auth` hook in `@workspace/assistant-app` was updated to align with this pattern.

## Work Performed

- Updated `apps/assistant-web/src/routes/auth.tsx` to use TanStack Router hooks for auth route handling.
- Updated `packages/assistant-app/src/hooks/use-auth.ts` to integrate TanStack Router hook patterns into the shared auth hook.

## Outcome

The web application auth refactor is complete. The following work remains:

- **TODO**: Update `apps/assistant-mobile` to use the updated auth hooks. The mobile app uses Expo Router (not TanStack Router), so the hook integration strategy may differ — evaluate compatibility or provide a separate mobile-specific implementation.
