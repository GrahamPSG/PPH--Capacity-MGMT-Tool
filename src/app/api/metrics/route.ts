import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { performanceMetricsService } from '@/services/metrics/PerformanceMetricsService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const division = searchParams.get('division');
    const projectTypes = searchParams.get('projectTypes')?.split(',');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }

    const metrics = await performanceMetricsService.getMetrics({
      period: {
        start: new Date(startDate),
        end: new Date(endDate),
        type: 'monthly' // Default, could be calculated from date range
      },
      division,
      projectTypes,
      excludeInactive: true
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}