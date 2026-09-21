# Fix 3 of 5 — Audit: split src/lib/teacher.ts god-file

**Source:** Milestone code audit 2026-09-19, finding HIGH-3. **Note: Kyle explicitly reordered the queue on 2026-09-20 — execute this now.** Fixes 4 and 5 touch `.cursorrules` and `InAppBrowserRedirect.tsx` respectively; neither overlaps any file this refactor moves. Push of Fix 2 precedes this work, so rollback point `9683c35` is on origin.

## Problem
`src/lib/teacher.ts` is 37KB with 53 exported functions — attendance, groups, students, analytics, and session logic all in one file. Every other domain got its own module (`dashboard.ts` 21KB, `music.ts` 14KB, `presentation.ts` 10KB). This is where the next feature gets bolted on wrongly, and it's the hardest file in the repo to review.

## Requirements
1. Split by sub-domain, matching how the rest of `src/lib/` already works (one file per domain, co-located `.test.ts`):
   - `src/lib/teacher/attendance.ts`
   - `src/lib/teacher/groups-students.ts`
   - `src/lib/teacher/analytics.ts`
   - `src/lib/teacher/sessions.ts` (or `month.ts` — match the existing `teacher-month.ts` if cleaner)
   - Keep `src/lib/teacher.ts` as a barrel re-export OR delete it and update all importers — your call, but be consistent and state which you chose.
2. PURE MOVE refactor: zero behavior changes, zero signature changes, zero "improvements". If you spot a bug while moving, STOP and note it in the PRD slice row instead of fixing silently.
3. Every existing import site in `src/app/teacher/` and elsewhere must keep working (update paths).
4. Existing tests in `teacher.test.ts` / `teacher-month.test.ts` move with their code and must pass unchanged (paths aside).

## Verify before commit
- `npx tsc --noEmit` and `npm test` pass.
- `wc -c` on the new files: none should exceed ~15KB.
- No function body diff except import/export lines: review your own diff for any logic change and revert it if found.
