import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, action } = await request.json();

    if (!bookingId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { flight: true, user: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (action === 'capture') {
      if (booking.status !== 'CONFIRMED') {
        return NextResponse.json({ error: 'Can only capture confirmed bookings' }, { status: 400 });
      }

      try {
        // Capture the payment intent
        await stripe.paymentIntents.capture(booking.stripePaymentId);

        // Update booking status
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'PAID' },
        });

        return NextResponse.json({ success: true, message: 'Payment captured successfully' });
      } catch (error) {
        console.error('Error capturing payment:', error);
        return NextResponse.json({ error: 'Failed to capture payment' }, { status: 500 });
      }
    } else if (action === 'refund') {
      if (!['CONFIRMED', 'PAID'].includes(booking.status)) {
        return NextResponse.json({ error: 'Can only refund confirmed or paid bookings' }, { status: 400 });
      }

      try {
        // Cancel the payment intent (releases the held amount)
        await stripe.paymentIntents.cancel(booking.stripePaymentId);

        // Update booking status and availability
        await prisma.$transaction([
          prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: 'REFUNDED',
              refunded: true,
              refundAmount: booking.totalAmount,
            },
          }),
          prisma.flight.update({
            where: { id: booking.flightId },
            data: {
              availableSeats: { increment: booking.seatsBooked },
              soldSeats: { decrement: booking.seatsBooked },
            },
          }),
        ]);

        return NextResponse.json({ success: true, message: 'Payment refunded successfully' });
      } catch (error) {
        console.error('Error refunding payment:', error);
        return NextResponse.json({ error: 'Failed to refund payment' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Escrow operation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
