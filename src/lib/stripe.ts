import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function parsePriceIdList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export function courseLevelForPriceId(
  priceId: string | null
): "pre-intermediate" | "intermediate" | null {
  if (!priceId) return null;
  if (parsePriceIdList(process.env.STRIPE_PRICE_PRE_INTERMEDIATE).has(priceId)) {
    return "pre-intermediate";
  }
  if (parsePriceIdList(process.env.STRIPE_PRICE_INTERMEDIATE).has(priceId)) {
    return "intermediate";
  }
  return null;
}

export function getBillingAppOrigin(): string {
  const fromEnv = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_ENV === "production") {
    return "https://learn.profekyle.com";
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function subscriptionCustomerId(
  subscription: Stripe.Subscription
): string | null {
  const customer = subscription.customer;
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export function subscriptionPriceId(
  subscription: Stripe.Subscription
): string | null {
  const price = subscription.items.data[0]?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

function unixToDate(value: unknown): Date | null {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

export function subscriptionStartedAt(subscription: Stripe.Subscription): Date {
  return (
    unixToDate(subscription.start_date) ??
    unixToDate(subscription.items.data[0]?.current_period_start) ??
    new Date()
  );
}

export function subscriptionPaidThrough(subscription: Stripe.Subscription): Date {
  const itemEnd = unixToDate(subscription.items.data[0]?.current_period_end);
  if (itemEnd) return itemEnd;
  const rootEnd = unixToDate(
    (subscription as { current_period_end?: number }).current_period_end
  );
  return rootEnd ?? new Date();
}

export function subscriptionLifecycleStatus(
  subscription: Stripe.Subscription
): "active" | "cancelled" | "paused" {
  if (subscription.pause_collection) return "paused";
  if (subscription.status === "paused") return "paused";
  if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired"
  ) {
    return "cancelled";
  }
  return "active";
}
