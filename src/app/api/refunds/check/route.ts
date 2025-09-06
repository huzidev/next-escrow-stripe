import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cancelPayment, createRefund } from '@/lib/stripe';
import { addDays, isBefore } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Get flights departing in 3 days that don't meet minimum seat requirements
    const threeDaysFromNow = addDays(new Date(), 3);
    
    const flightsToCheck = await prisma.flight.findMany({
      where: {
        departureTime: {
          lte: threeDaysFromNow,
          gte: new Date(), // Only future flights
        },
        status: 'SCHEDULED',
      },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            refunded: false,
          },
        },
      },
    });

    const results = [];

    for (const flight of flightsToCheck) {
      if (flight.soldSeats < flight.minimumSeats) {
        // Flight doesn't meet minimum requirements, process refunds
        
        for (const booking of flight.bookings) {
          try {
            let refundResult;
            
            if (booking.status === 'PENDING') {
              // Cancel the payment intent (not yet captured)
              await cancelPayment(booking.stripePaymentId!);
            } else if (booking.status === 'CONFIRMED') {
              // Create refund for captured payment
              refundResult = await createRefund(booking.stripePaymentId!);
            }

            // Update booking as refunded
            await prisma.booking.update({
              where: { id: booking.id },
              data: {
                status: 'REFUNDED',
                refunded: true,
                refundAmount: booking.totalAmount,
              },
            });

            results.push({
              bookingId: booking.id,
              flightNumber: flight.flightNumber,
              refundAmount: booking.totalAmount,
              status: 'refunded',
            });

          } catch (error) {
            console.error(`Failed to refund booking ${booking.id}:`, error);
            results.push({
              bookingId: booking.id,
              flightNumber: flight.flightNumber,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Update flight status
        await prisma.flight.update({
          where: { id: flight.id },
          data: { status: 'REFUNDED' },
        });
      }
    }

    return NextResponse.json({
      message: 'Refund check completed',
      results,
      flightsChecked: flightsToCheck.length,
    });

  } catch (error) {
    console.error('Refund check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
