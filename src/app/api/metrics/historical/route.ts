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
    const metric = searchParams.get('metric') as any;
    const periods = parseInt(searchParams.get('periods') || '12');
    const periodType = searchParams.get('periodType') as 'daily' | 'weekly' | 'monthly' || 'monthly';

    if (!metric) {
      return NextResponse.json(
        { error: 'Metric type is required' },
        { status: 400 }
      );
    }

    const historicalData = await performanceMetricsService.getHistoricalMetrics(
      metric,
      periods,
      periodType
    );

    return NextResponse.json(historicalData);
  } catch (error) {
    console.error('Error fetching historical metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical metrics' },
      { status: 500 }
    );
  }
}