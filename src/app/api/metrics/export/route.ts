import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { performanceMetricsService } from '@/services/metrics/PerformanceMetricsService';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { period, division } = body;

    let start: Date, end: Date;
    const now = new Date();

    switch (period) {
      case 'daily':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case 'monthly':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarterly':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        end = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    const buffer = await performanceMetricsService.exportMetricsReport({
      period: {
        start,
        end,
        type: period || 'monthly'
      },
      division,
      excludeInactive: true
    });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="metrics-report-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Error exporting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to export metrics' },
      { status: 500 }
    );
  }
}