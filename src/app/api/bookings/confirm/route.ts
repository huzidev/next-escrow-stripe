import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { flight: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Update flight seats and booking status in a transaction
    await prisma.$transaction([
      prisma.flight.update({
        where: { id: booking.flightId },
        data: {
          availableSeats: { decrement: booking.seatsBooked },
          soldSeats: { increment: booking.seatsBooked },
        },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      }),
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
