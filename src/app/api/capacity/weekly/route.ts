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

    if (!division) {
      return NextResponse.json(
        { error: 'Division is required for weekly capacity' },
        { status: 400 }
      );
    }

    const weeklyData = await CapacityCalculator.calculateWeeklyCapacity(
      new Date(startDate),
      new Date(endDate),
      division
    );

    return NextResponse.json(weeklyData);
  } catch (error) {
    console.error('Error fetching weekly capacity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly capacity data' },
      { status: 500 }
    );
  }
}