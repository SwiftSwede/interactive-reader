# ADR 018: Parallel classroom cohort

## Context

One level can now run two Zoom rooms in the same month (intermediate, Tuesday/Thursday earlier, and the existing later room). Lessons are the same catalog rows. The clock, Zoom link, roster, and teacher pace are per course session, so each room needs its own month.

Stripe only knows the price level. Enrollment used to insert every paying student into every unarchived course at that level. A second intermediate month would mix the rooms, and the next invoice would put removed students back.

## Decision

`courses.cohort` and `profiles.classroom_cohort` are `main` or `extra`. Existing rows default to `main`.

Stripe, Nuevo mes, and a class-link open enroll only into the matching cohort. Stripe never changes the cohort. New intermediate payments stay in `main`.

The teacher moves a student to the other cohort. That drops them from live courses at the old cohort and adds them to live courses at the new one. The next payment keeps them there.

Archiving a new month, and copying its Zoom link, stays inside the same cohort. Creating the extra December month does not archive the main November month.

## Consequences

- A third room needs a new cohort value and a CHECK update (ADR 007).
- The extra month starts empty. Kyle moves people onto it. Next month, Nuevo mes on that cohort enrolls them again.
- A student who opens the other room's class link sees the wrong-group state. The link does not switch their cohort.
