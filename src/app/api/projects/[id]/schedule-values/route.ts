import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/services/projects/ProjectService';
import { verifyAuth } from '@/lib/auth/verify';
import { hasPermission } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'VIEW_FINANCIALS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const scheduleOfValues = await ProjectService.getProjectScheduleOfValues(params.id);

    return NextResponse.json(scheduleOfValues);
  } catch (error) {
    console.error('Error fetching schedule of values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule of values' },
      { status: 500 }
    );
  }
}