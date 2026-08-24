import { handleStripeEvent } from "@/lib/stripe-billing";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!secret || !signature) {
    console.error("stripe webhook missing secret or signature");
    return new Response("Webhook not configured", { status: 400 });
  }

  const body = await request.text();
  let event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error("stripe webhook signature failed:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error("stripe webhook handler failed", event.id, event.type, error);
    return new Response("Handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}
