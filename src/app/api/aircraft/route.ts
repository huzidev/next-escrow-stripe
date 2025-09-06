import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const aircraft = await prisma.aircraft.findMany({
      orderBy: { manufacturer: 'asc' },
    });

    return NextResponse.json(aircraft);
  } catch (error) {
    console.error('Aircraft fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
