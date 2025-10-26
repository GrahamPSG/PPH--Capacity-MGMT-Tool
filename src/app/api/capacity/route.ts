import { NextRequest, NextResponse } from 'next/server';
import { CapacityCalculator } from '@/services/capacity/CapacityCalculator';
import { verifyAuth } from '@/services/auth/AuthService';
import { Division } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const division = searchParams.get('division') as Division | null;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const capacityData = await CapacityCalculator.calculateMonthlyCapacity(
      new Date(startDate),
      new Date(endDate),
      division || undefined
    );

    return NextResponse.json(capacityData);
  } catch (error) {
    console.error('Error fetching capacity data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capacity data' },
      { status: 500 }
    );
  }
}

// Get capacity forecast for a specific number of months
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { months = 6, division } = body;

    if (months < 1 || months > 24) {
      return NextResponse.json(
        { error: 'Months must be between 1 and 24' },
        { status: 400 }
      );
    }

    const forecast = await CapacityCalculator.getCapacityForecast(
      months,
      division
    );

    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Error generating capacity forecast:', error);
    return NextResponse.json(
      { error: 'Failed to generate capacity forecast' },
      { status: 500 }
    );
  }
}