---
date: 2026-03-03T16:42:33Z
type: decision
status: complete
agent: claude-sonnet-4-6
branch: t2
tags: [orm, drizzle, prisma, database, typescript, architecture]
related_plan:
---

# Adopt Drizzle ORM Over Prisma

## Summary

Drizzle ORM is chosen as the project's ORM over Prisma due to its better performance, native TypeScript support, and compatibility with the Cloudflare Workers edge runtime.

## Context

The project backend (`assistant-server`) runs on Cloudflare Workers and requires a TypeScript-compatible ORM. A comparison of Drizzle ORM and Prisma was conducted to confirm or revise the current tooling choice. See `research/2026-03-03_164233Z_drizzle-vs-prisma-orm.md` for full findings.

## Options Considered

### Drizzle ORM

- Faster query execution with minimal abstraction overhead.
- Schema defined in native TypeScript — no separate schema language or code generation step.
- Small bundle size compatible with Cloudflare Workers edge runtime.
- Growing but less mature ecosystem.
- CLI tooling is functional but less polished.

### Prisma

- Mature ecosystem with broad adoption and extensive documentation.
- Excellent CLI with migration management, database introspection, and Prisma Studio.
- Slower at runtime due to its Rust-based query engine.
- Types are generated from a `.prisma` schema, adding a build step.
- Query engine binary is incompatible with edge runtimes without workarounds.

## Decision

**Adopt Drizzle ORM.** The combination of native TypeScript schema definitions, faster runtime performance, and full edge runtime compatibility makes Drizzle the better fit for this project's constraints and priorities. Prisma's CLI advantage does not outweigh these technical benefits given the Cloudflare Workers deployment target.

This is consistent with the existing architecture documentation which already lists Drizzle ORM as the ORM for the backend.

## Consequences

- **Positive**: Smaller bundle, faster queries, improved type safety without code generation, edge-compatible.
- **Negative**: Less mature ecosystem; developers more familiar with Prisma may have a learning curve.
- **Revisit if**: Drizzle's ecosystem fails to mature, significant migration tooling gaps emerge, or the backend moves off Cloudflare Workers to a runtime where Prisma's query engine is viable.
