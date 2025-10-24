import { NextRequest, NextResponse } from 'next/server';
import { AssignmentService } from '@/services/assignments/AssignmentService';
import { verifyAuth } from '@/lib/auth/verify';
import { hasPermission } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'CREATE_ASSIGNMENTS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Convert date string to Date object
    if (body.assignmentDate) body.assignmentDate = new Date(body.assignmentDate);

    const validation = await AssignmentService.validateAssignment(body);

    return NextResponse.json(validation);
  } catch (error: any) {
    console.error('Error validating assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate assignment' },
      { status: 500 }
    );
  }
}