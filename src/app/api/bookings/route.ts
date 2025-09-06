import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPaymentIntent } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { flightId, passengerName, passengerEmail, seatsToBook } = await request.json();

    // Validate input
    if (!flightId || !passengerName || !passengerEmail || !seatsToBook) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check flight availability
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: { aircraft: true },
    });

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    if (flight.availableSeats < seatsToBook) {
      return NextResponse.json({ error: 'Not enough seats available' }, { status: 400 });
    }

    const totalAmount = flight.price * seatsToBook;

    // Create Stripe payment intent with hold
    const paymentIntent = await createPaymentIntent(totalAmount, {
      flightId,
      userId: session.user.id,
      seatsToBook: seatsToBook.toString(),
      flightNumber: flight.flightNumber,
    });

    // Create booking with pending status
    const booking = await prisma.booking.create({
      data: {
        passengerName,
        passengerEmail,
        seatsBooked: seatsToBook,
        totalAmount,
        status: 'PENDING',
        stripePaymentId: paymentIntent.id,
        userId: session.user.id,
        flightId,
      },
    });

    return NextResponse.json({
      bookingId: booking.id,
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
    });

  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
