import { NextRequest, NextResponse } from 'next/server';
import { CapacityCalculator } from '@/services/capacity/CapacityCalculator';
import { verifyAuth } from '@/services/auth/AuthService';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const threshold = searchParams.get('threshold');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const thresholdValue = threshold ? parseInt(threshold) : 90;

    if (thresholdValue < 0 || thresholdValue > 100) {
      return NextResponse.json(
        { error: 'Threshold must be between 0 and 100' },
        { status: 400 }
      );
    }

    const criticalPeriods = await CapacityCalculator.getCriticalPeriods(
      new Date(startDate),
      new Date(endDate),
      thresholdValue
    );

    return NextResponse.json(criticalPeriods);
  } catch (error) {
    console.error('Error fetching critical periods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch critical periods' },
      { status: 500 }
    );
  }
}