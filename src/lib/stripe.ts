import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

// Create payment intent with authorization hold
export async function createPaymentIntent(amount: number, metadata: any) {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    capture_method: 'manual', // This enables the escrow hold
    metadata,
  });
}

// Capture the payment (when minimum seats are met)
export async function capturePayment(paymentIntentId: string) {
  return await stripe.paymentIntents.capture(paymentIntentId);
}

// Cancel the payment intent (refund when minimum seats not met)
export async function cancelPayment(paymentIntentId: string) {
  return await stripe.paymentIntents.cancel(paymentIntentId);
}

// Create refund for captured payments
export async function createRefund(paymentIntentId: string, amount?: number) {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
  });
}
