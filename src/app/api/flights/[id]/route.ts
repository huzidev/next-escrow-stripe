import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = params;
    const updateData = await request.json();

    // Remove fields that shouldn't be updated directly
    const { id: _id, createdAt, updatedAt, ...allowedUpdates } = updateData;

    const flight = await prisma.flight.update({
      where: { id },
      data: {
        ...allowedUpdates,
        ...(allowedUpdates.departureTime && { departureTime: new Date(allowedUpdates.departureTime) }),
        ...(allowedUpdates.arrivalTime && { arrivalTime: new Date(allowedUpdates.arrivalTime) }),
        ...(allowedUpdates.price && { price: parseFloat(allowedUpdates.price) }),
      },
      include: {
        aircraft: true,
      },
    });

    return NextResponse.json(flight);
  } catch (error) {
    console.error('Flight update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = params;

    // Check if flight has bookings
    const flight = await prisma.flight.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        },
      },
    });

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    if (flight.bookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete flight with existing bookings' },
        { status: 400 }
      );
    }

    await prisma.flight.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Flight deleted successfully' });
  } catch (error) {
    console.error('Flight deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
