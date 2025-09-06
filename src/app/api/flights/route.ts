import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');

    let whereClause: any = {
      status: 'SCHEDULED',
      availableSeats: { gt: 0 },
    };

    if (origin) {
      whereClause.origin = { contains: origin, mode: 'insensitive' };
    }

    if (destination) {
      whereClause.destination = { contains: destination, mode: 'insensitive' };
    }

    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereClause.departureTime = {
        gte: searchDate,
        lt: nextDay,
      };
    }

    const flights = await prisma.flight.findMany({
      where: whereClause,
      include: {
        aircraft: true,
      },
      orderBy: { departureTime: 'asc' },
    });

    return NextResponse.json(flights);
  } catch (error) {
    console.error('Flights fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const {
      flightNumber,
      origin,
      destination,
      departureTime,
      arrivalTime,
      price,
      minimumSeats,
      aircraftId,
    } = await request.json();

    // Validate required fields
    if (!flightNumber || !origin || !destination || !departureTime || !arrivalTime || !price || !aircraftId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if flight number already exists
    const existingFlight = await prisma.flight.findUnique({
      where: { flightNumber },
    });

    if (existingFlight) {
      return NextResponse.json({ error: 'Flight number already exists' }, { status: 400 });
    }

    // Get aircraft to determine total seats
    const aircraft = await prisma.aircraft.findUnique({
      where: { id: aircraftId },
    });

    if (!aircraft) {
      return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
    }

    const flight = await prisma.flight.create({
      data: {
        flightNumber,
        origin,
        destination,
        departureTime: new Date(departureTime),
        arrivalTime: new Date(arrivalTime),
        price: parseFloat(price),
        totalSeats: aircraft.totalSeats,
        availableSeats: aircraft.totalSeats,
        soldSeats: 0,
        minimumSeats: minimumSeats || 5,
        aircraftId,
      },
      include: {
        aircraft: true,
      },
    });

    return NextResponse.json(flight, { status: 201 });
  } catch (error) {
    console.error('Flight creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
