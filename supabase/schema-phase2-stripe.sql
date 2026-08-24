-- Interactive Reader App — Slices 14–15 (Stripe webhooks)
-- Run this in the Supabase SQL Editor AFTER schema-phase2a.sql
--
-- App env (do not commit secrets):
--   STRIPE_SECRET_KEY=sk_test_...
--   STRIPE_WEBHOOK_SECRET=whsec_...   (from `stripe listen` locally, or Workbench in prod)
--   APP_ORIGIN=http://localhost:3000  (prod: https://learn.profekyle.com)
--   STRIPE_PRICE_PRE_INTERMEDIATE=price_...,price_...
--   STRIPE_PRICE_INTERMEDIATE=price_...
--
-- Local test:
--   stripe listen --forward-to localhost:3000/api/webhooks/stripe
-- Paste the printed whsec_ into STRIPE_WEBHOOK_SECRET, restart `npm run dev`.
--
-- Production: Stripe Workbench → add destination
--   https://learn.profekyle.com/api/webhooks/stripe
-- Events: checkout.session.completed, customer.subscription.created,
--   customer.subscription.updated, customer.subscription.deleted,
--   invoice.paid, invoice.payment_failed

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_periods_stripe_sub
  ON public.subscription_periods(stripe_subscription_id);
