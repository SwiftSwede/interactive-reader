# Fix 5 of 5 — Audit: replace raw hex with design tokens in InAppBrowserRedirect

**Source:** Milestone code audit 2026-09-19, finding LOW-5. Trivial, ~5 minutes.

## Problem
`src/components/InAppBrowserRedirect.tsx` lines ~63 and ~80 use inline raw hex `#4f46e5` for background and color. Every other component uses the DESIGN.md token system (`bg-accent` etc.), and `.cursorrules` mandates tokens only. Note: `#4f46e5` is indigo — it predates the Paper Light palette and doesn't match any current token; the fix should map it to the correct existing token, NOT introduce a new hex.

## Requirements
1. Replace inline hex styles with the DESIGN.md token equivalents (likely a button/secondary style — check DESIGN.md for the correct accent/secondary treatment for this in-app-browser redirect notice).
2. If the component intentionally needed a color that has no token (e.g. something that must stand out against a browser chrome), flag it to Kyle in the summary instead of inventing a new hex.
3. Nothing else in the component changes.

## Verify before commit
- `grep -n "#4f46e5" src/components/InAppBrowserRedirect.tsx` returns nothing.
- `npx tsc --noEmit` passes; component renders correctly at http://localhost:3004 (this component shows on in-app browser redirects — verify with the dev server, not production).
