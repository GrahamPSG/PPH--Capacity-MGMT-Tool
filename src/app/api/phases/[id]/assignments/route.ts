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

    const assignments = await AssignmentService.getPhaseAssignments(params.id);

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching phase assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phase assignments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'CREATE_ASSIGNMENTS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    body.phaseId = params.id;

    // Convert date string to Date object
    if (body.assignmentDate) body.assignmentDate = new Date(body.assignmentDate);

    const assignment = await AssignmentService.createAssignment(body, user.id);

    return NextResponse.json(assignment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create assignment' },
      { status: 400 }
    );
  }
}