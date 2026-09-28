# AGENTS.md

## Project

Interactive reader and classroom companion for the Confident Speaker Circle: a Next.js PWA at `learn.profekyle.com` that makes Profe Kyle's Sistema de 8 (8 live Zoom classes per month, two levels) available as in-app lessons between classes, with a teacher dashboard for Kyle.

## Commands

- Install: `npm install`
- Develop: `npm run dev` (pinned to http://localhost:3004 only; never probe 3000-3003)
- Test: `npm test`
- Lint: `npm run lint`
- Build: `npx next build` (or minimum `npx tsc --noEmit`); required before any push touching `src/`

## Architecture

- `src/app/` — Next.js App Router pages and API routes (thin handlers, no business logic)
- `src/lib/` — business logic, one module per domain, with co-located `.test.ts` files; `src/lib/services/` for cross-domain services
- `src/components/` — presentation only; data via API routes or TanStack Query
- `supabase/migrations/` — Postgres schema; RLS on every table
- `scripts/` — terminal/seed scripts; update `SCRIPTS.md` when touched
- `docs/PRD.md` — authoritative product requirements (53 slices, 7 phases); `docs/adr/` — architecture decisions
- `.cursorrules` — the full working ruleset for AI agents (this file only orients; that file governs)

## Working rules

- Read `.cursorrules` before any work. It defines the product decisions, security standards, testing discipline, and build order.
- No product/UI work without reading `product.md` (who this is for, what it must feel like) and `DESIGN.md` (all visual tokens and rules). Reuse documented components and tokens; ask before introducing an uncovered pattern.
- Never break a working slice; commit and push after every verified slice.
- Magic-link auth, no passwords. IPA everywhere in the app. Mobile-first: nothing ships that doesn't work at 375px.
- Read `docs/adr/` before architectural decisions; write a new ADR for significant ones.

## Product and UI

Before product or UI work, read `product.md`. Before writing or changing UI, also read `DESIGN.md`. Do not contradict either. If a design need is not covered, ask before inventing a new token, radius, or pattern; approved inventions update `DESIGN.md` so it stays the source of truth.
