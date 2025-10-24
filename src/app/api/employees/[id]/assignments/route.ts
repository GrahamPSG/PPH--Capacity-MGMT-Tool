import { NextRequest, NextResponse } from 'next/server';
import { AssignmentService } from '@/services/assignments/AssignmentService';
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

    if (!hasPermission(user.role, 'VIEW_ASSIGNMENTS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const assignments = await AssignmentService.getEmployeeAssignments(
      params.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching employee assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee assignments' },
      { status: 500 }
    );
  }
}