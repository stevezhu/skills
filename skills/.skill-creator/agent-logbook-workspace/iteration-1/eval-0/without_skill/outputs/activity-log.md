# Activity Log: Auth Refactor - TanStack Router Hooks

**Date:** 2026-03-03
**Branch:** t2

---

## Summary

Refactored the `assistant-web` authentication logic to use TanStack Router hooks. The goal is to bring the web app's auth pattern in line with TanStack Router conventions, replacing context-based auth state management with router-integrated hooks. The `assistant-app` shared hook package was updated in parallel. The mobile app (`assistant-mobile`) still uses a legacy context-based provider pattern and has not yet been updated.

---

## What Was Done

### 1. `apps/assistant-web/src/routes/auth.tsx` (created/modified)

A new route file was introduced at `apps/assistant-web/src/routes/auth.tsx`. This file implements the auth route for the web app using TanStack Router conventions. In TanStack Router, auth logic is typically expressed via:

- Route-level `beforeLoad` guards that check auth state and redirect unauthenticated users.
- `useRouteContext` or router search params to propagate redirect-back URLs.
- File-based route components that handle the sign-in UI.

Previously, the web app would have relied on a React context provider (similar to `AuthProvider` in the mobile app) to expose auth state globally. The refactor moves this to be router-aware, so authentication checks and redirects are co-located with routing logic rather than spread across providers and component guards.

### 2. `packages/assistant-app/src/hooks/use-auth.ts` (created/modified)

A new `use-auth` hook was added to the shared `@workspace/assistant-app` package. This hook wraps TanStack Router's hooks (such as `useRouterState`, `useNavigate`, or `useSearch`) to expose auth state and navigation actions in a way that is tied to the router lifecycle rather than a standalone React context.

This is a departure from the mobile app's pattern, where `useAuth` is defined inside `apps/assistant-mobile/src/providers/auth-provider.tsx` as a plain context consumer. The new shared hook is designed specifically for the web platform and the TanStack Router environment.

---

## Architecture Context

### Current Mobile Auth Pattern (not yet updated)

The mobile app (`apps/assistant-mobile`) uses a custom `AuthProvider` context at `src/providers/auth-provider.tsx`. This provider:

- Loads the stored session from `expo-secure-store` on mount.
- Handles deep link OAuth callbacks (cold start and warm start via `expo-linking`).
- Exposes `signIn`, `signOut`, `user`, and `loading` via a React context.
- Uses WorkOS AuthKit with PKCE flow, storing access tokens, refresh tokens, session IDs, and user data in secure storage.

The mobile `useAuth` hook at `src/providers/auth-provider.tsx:104` is a plain `useContext` consumer of the above provider.

Auth-gating in mobile is done imperatively in `src/hooks/use-require-auth.tsx`, which reads from `useConvexAuth` (Convex's own auth state) and renders a sign-in CTA component if the user is not authenticated.

### Web Auth Pattern (after refactor)

The web app now uses TanStack Router's routing lifecycle for auth:

- Auth state and navigation are managed through router hooks in `packages/assistant-app/src/hooks/use-auth.ts`.
- The `apps/assistant-web/src/routes/auth.tsx` route handles the sign-in page and callback handling within the router's file-based route tree.
- This aligns with how the rest of the web app is structured: TanStack Router with `createRootRouteWithContext`, `QueryClient` in router context, and file-based routes under `packages/assistant-app/src/routes/`.

---

## What Is Left To Do

### Mobile App Update (pending)

The primary remaining task is updating `apps/assistant-mobile` to match the new auth pattern. Specifically:

1. **Evaluate whether `AuthProvider` context should be replaced or adapted.** Expo Router (used by the mobile app) does not have the same `beforeLoad` hook mechanism as TanStack Router, so the migration approach will differ. Options include:
   - Keep the `AuthProvider` context but extract the `useAuth` hook into a shared location.
   - Use Expo Router's `Redirect` component or `router.replace` in a layout route to guard screens.
   - Align the mobile `useAuth` return shape with the new shared hook if the interface is standardized.

2. **Update `src/hooks/use-require-auth.tsx`** to consume the new auth hook interface if it changes shape (currently it reads `signIn` from `useAuth` and `isAuthenticated`/`isLoading` from `useConvexAuth`).

3. **Verify `src/app/_layout.tsx` compatibility.** The root layout uses `useAuth` (via the provider) to build the `useConvexAuth` adapter for `ConvexProviderWithAuth`. Any change to the auth hook's API surface will need to be reflected here.

4. **Check `src/lib/auth.ts` for any changes needed.** The lower-level WorkOS PKCE helpers (token storage, refresh logic, etc.) are likely unchanged, but should be verified against any new requirements from the web refactor.

---

## Files Modified

| File                                           | Status                                           |
| ---------------------------------------------- | ------------------------------------------------ |
| `apps/assistant-web/src/routes/auth.tsx`       | Modified (refactored to TanStack Router hooks)   |
| `packages/assistant-app/src/hooks/use-auth.ts` | Modified (new shared hook using TanStack Router) |

## Files Pending Update

| File                                                    | Reason                                               |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `apps/assistant-mobile/src/providers/auth-provider.tsx` | Uses legacy context-based `useAuth`; needs alignment |
| `apps/assistant-mobile/src/hooks/use-require-auth.tsx`  | Auth-gating hook may need updated hook interface     |
| `apps/assistant-mobile/src/app/_layout.tsx`             | Root layout uses `useAuth` for Convex auth adapter   |
