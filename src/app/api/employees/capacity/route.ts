import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityCalculator } from '@/services/employees/AvailabilityCalculator';
import { verifyAuth } from '@/lib/auth/verify';
import { hasPermission } from '@/lib/auth/rbac';
import { Division } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'VIEW_CAPACITY')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weeks = parseInt(searchParams.get('weeks') || '4');
    const division = searchParams.get('division') as Division | null;

    const capacity = await AvailabilityCalculator.getDivisionCapacity(
      division || undefined,
      weeks
    );

    return NextResponse.json(capacity);
  } catch (error) {
    console.error('Error fetching capacity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capacity' },
      { status: 500 }
    );
  }
}