import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Find the booking associated with this payment
        const booking = await prisma.booking.findFirst({
          where: { stripePaymentId: paymentIntent.id },
          include: { flight: true },
        });

        if (booking && booking.status === 'PENDING') {
          // Update booking status to confirmed
          await prisma.$transaction([
            prisma.booking.update({
              where: { id: booking.id },
              data: { status: 'CONFIRMED' },
            }),
            prisma.flight.update({
              where: { id: booking.flightId },
              data: {
                availableSeats: { decrement: booking.seatsBooked },
                soldSeats: { increment: booking.seatsBooked },
              },
            }),
          ]);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        
        // Find and cancel the booking
        const failedBooking = await prisma.booking.findFirst({
          where: { stripePaymentId: failedPayment.id },
        });

        if (failedBooking && failedBooking.status === 'PENDING') {
          await prisma.booking.update({
            where: { id: failedBooking.id },
            data: { status: 'CANCELLED' },
          });
        }
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object as Stripe.PaymentIntent;
        
        // Find and cancel the booking
        const canceledBooking = await prisma.booking.findFirst({
          where: { stripePaymentId: canceledPayment.id },
        });

        if (canceledBooking && canceledBooking.status === 'PENDING') {
          await prisma.booking.update({
            where: { id: canceledBooking.id },
            data: { 
              status: 'REFUNDED',
              refunded: true,
              refundAmount: canceledBooking.totalAmount,
            },
          });
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
