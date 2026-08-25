import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherEmail } from "@/lib/auth";
import {
  courseLevelForPriceId,
  getBillingAppOrigin,
  getStripe,
  subscriptionCustomerId,
  subscriptionLifecycleStatus,
  subscriptionPaidThrough,
  subscriptionPriceId,
  subscriptionStartedAt,
} from "@/lib/stripe";
import { isActiveClassroomSubscription } from "@/lib/classroom-access";
import { enrollInClassroomHome } from "@/lib/classroom-placement";
import type { SubscriptionStatus } from "@/types";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function expandedCustomer(
  customer: Stripe.Subscription["customer"]
): Stripe.Customer | null {
  if (!customer || typeof customer === "string") return null;
  if ("deleted" in customer && customer.deleted) return null;
  return customer;
}

async function customerEmail(
  customerId: string,
  fallback?: string | null,
  expanded?: Stripe.Customer | null
): Promise<string | null> {
  if (fallback && isValidEmail(fallback)) {
    return fallback.trim().toLowerCase();
  }

  const expandedEmail = expanded?.email?.trim().toLowerCase();
  if (expandedEmail && isValidEmail(expandedEmail)) {
    return expandedEmail;
  }

  const customer = await getStripe().customers.retrieve(customerId);
  if (customer.deleted) return null;
  const email = customer.email?.trim().toLowerCase();
  return email && isValidEmail(email) ? email : null;
}

async function customerDisplayName(
  customerId: string,
  email: string,
  expanded?: Stripe.Customer | null,
  skipStripeRetrieve?: boolean
): Promise<string> {
  if (expanded?.name?.trim()) {
    return expanded.name.trim();
  }
  if (skipStripeRetrieve) {
    return email.split("@")[0] ?? email;
  }

  const customer = await getStripe().customers.retrieve(customerId);
  if (!customer.deleted && customer.name?.trim()) {
    return customer.name.trim();
  }
  return email.split("@")[0] ?? email;
}

async function upsertClassroomProfile(params: {
  userId: string;
  email: string;
  customerId: string;
  status: SubscriptionStatus;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      id: params.userId,
      email: params.email,
      role: "student-classroom",
      stripe_customer_id: params.customerId,
      subscription_status: params.status,
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Failed to upsert classroom profile: ${error.message}`);
  }
}

async function upsertSubscriptionPeriod(params: {
  userId: string;
  subscriptionId: string;
  startedAt: Date;
  status: "active" | "cancelled" | "paused";
  paidThrough: Date;
}): Promise<void> {
  const admin = createAdminClient();
  const endedAt =
    params.status === "active" ? null : params.paidThrough.toISOString();

  const { data: existing, error: loadError } = await admin
    .from("subscription_periods")
    .select("id")
    .eq("stripe_subscription_id", params.subscriptionId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load subscription period: ${loadError.message}`);
  }

  if (existing) {
    const { error } = await admin
      .from("subscription_periods")
      .update({
        user_id: params.userId,
        status: params.status,
        ended_at: endedAt,
      })
      .eq("id", existing.id);
    if (error) {
      throw new Error(`Failed to update subscription period: ${error.message}`);
    }
    return;
  }

  const { error } = await admin.from("subscription_periods").insert({
    user_id: params.userId,
    stripe_subscription_id: params.subscriptionId,
    started_at: params.startedAt.toISOString(),
    ended_at: endedAt,
    status: params.status,
  });

  if (error) {
    throw new Error(`Failed to insert subscription period: ${error.message}`);
  }
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const fromParent = invoice.parent?.subscription_details?.subscription;
  if (!fromParent) return null;
  return typeof fromParent === "string" ? fromParent : fromParent.id;
}

async function ensureClassroomUser(params: {
  email: string;
  customerId: string;
  status: SubscriptionStatus;
  displayName: string;
}): Promise<{ userId: string; created: boolean } | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", params.email)
    .maybeSingle();

  if (existing?.role === "teacher" || isTeacherEmail(params.email)) {
    console.error("stripe billing: skipping teacher email");
    return null;
  }

  if (existing) {
    await upsertClassroomProfile({
      userId: existing.id,
      email: params.email,
      customerId: params.customerId,
      status: params.status,
    });
    return { userId: existing.id, created: false };
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: params.email,
      email_confirm: true,
      user_metadata: { display_name: params.displayName },
    });

  if (createError || !created.user) {
    const { data: raced } = await admin
      .from("profiles")
      .select("id, role")
      .eq("email", params.email)
      .maybeSingle();

    if (!raced || raced.role === "teacher") {
      if (raced?.role === "teacher") return null;
      throw new Error(
        createError?.message ?? "Could not create classroom user from Stripe"
      );
    }

    await upsertClassroomProfile({
      userId: raced.id,
      email: params.email,
      customerId: params.customerId,
      status: params.status,
    });
    return { userId: raced.id, created: false };
  }

  await upsertClassroomProfile({
    userId: created.user.id,
    email: params.email,
    customerId: params.customerId,
    status: params.status,
  });
  return { userId: created.user.id, created: true };
}

async function sendClassroomMagicLink(email: string): Promise<void> {
  const admin = createAdminClient();
  const redirectTo = `${getBillingAppOrigin()}/auth/callback?next=/dashboard`;
  const { error } = await admin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    console.error("stripe billing magic link failed:", error.message);
  }
}

export async function syncClassroomFromSubscription(
  subscription: Stripe.Subscription,
  emailHint?: string | null,
  options?: { skipMagicLink?: boolean; skipStripeRetrieve?: boolean }
): Promise<void> {
  const customerId = subscriptionCustomerId(subscription);
  if (!customerId) {
    console.error("stripe billing: subscription missing customer", subscription.id);
    return;
  }

  const expanded = expandedCustomer(subscription.customer);
  const email = await customerEmail(customerId, emailHint, expanded);
  if (!email) {
    console.error("stripe billing: no email for customer", customerId);
    return;
  }

  const status = subscriptionLifecycleStatus(subscription);
  const displayName = await customerDisplayName(
    customerId,
    email,
    expanded,
    options?.skipStripeRetrieve
  );
  const ensured = await ensureClassroomUser({
    email,
    customerId,
    status,
    displayName,
  });
  if (!ensured) return;
  const { userId, created } = ensured;

  await upsertSubscriptionPeriod({
    userId,
    subscriptionId: subscription.id,
    startedAt: subscriptionStartedAt(subscription),
    status,
    paidThrough: subscriptionPaidThrough(subscription),
  });

  const level = courseLevelForPriceId(subscriptionPriceId(subscription));
  if (isActiveClassroomSubscription(status)) {
    await enrollInClassroomHome({
      studentId: userId,
      priceLevel: level,
      displayName,
    });
  }

  if (created && isActiveClassroomSubscription(status) && !options?.skipMagicLink) {
    await sendClassroomMagicLink(email);
  }
}

async function retrieveSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return getStripe().subscriptions.retrieve(subscriptionId);
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || session.status !== "complete") {
        return;
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) return;
      const subscription = await retrieveSubscription(subscriptionId);
      const email =
        session.customer_details?.email ?? session.customer_email ?? null;
      await syncClassroomFromSubscription(subscription, email);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncClassroomFromSubscription(subscription);
      return;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (!subscriptionId) return;
      const subscription = await retrieveSubscription(subscriptionId);
      await syncClassroomFromSubscription(
        subscription,
        invoice.customer_email ?? null
      );
      return;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.error("stripe invoice.payment_failed", {
        invoiceId: invoice.id,
        customer: invoice.customer,
      });
      return;
    }
    default:
      return;
  }
}
