# ADR 001: Teacher-First Build Strategy

## Context

The PRD originally laid out phases in consumer-first order: free story MVP (Phase 1), then consumer paid tier (Phase 2), then teacher dashboard later. Kyle teaches live group classes on Zoom with two groups (intermediate + pre-intermediate), 8 sessions per month per group. The classroom product is the active revenue driver. The consumer $47 lifetime tier is a demand test, not yet validated.

Building the consumer tier first would mean building payment gating, content packaging, and self-service flows before the teacher dashboard that Kyle needs to run his existing classes. The classroom students already pay via Stripe subscription. Kyle needs session management, attendance tracking, reveal gating, and student data visibility before he needs a consumer checkout flow.

## Decision

Build the teacher dashboard as Phase 2, not the consumer paid tier. Classroom features (courses, sessions, enrollment, word lookup tracking, writing class, exam) take priority. Consumer features (Stripe Checkout $47, content gating, reverse translation, print, beginner carousel) move to Phase 5.

## Consequences

- Kyle can use the app with his existing students immediately, not after a consumer launch.
- Classroom and consumer students use identical reader components. Context determines active features. No separate codebase.
- Consumer tier development is deferred but not blocked. All classroom features compose into the consumer product later.
- The teacher dashboard became the most complex part of the app (roster, session detail, word lookup aggregation, student detail). Building it early meant these patterns are established before consumer features layer on top.
