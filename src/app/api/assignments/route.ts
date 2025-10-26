import { NextRequest, NextResponse } from 'next/server';
import { AssignmentService } from '@/services/assignments/AssignmentService';
import { verifyAuth } from '@/lib/auth/verify';
import { UserRole } from '@prisma/client';

/**
 * GET /api/assignments
 * Get assignments with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phaseId = searchParams.get('phaseId');
    const employeeId = searchParams.get('employeeId');
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // If specific filters provided, use them
    if (phaseId) {
      const assignments = await AssignmentService.getPhaseAssignments(phaseId);
      return NextResponse.json(assignments);
    }

    if (employeeId) {
      const assignments = await AssignmentService.getEmployeeAssignments(employeeId);
      return NextResponse.json(assignments);
    }

    // Otherwise require date range
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required when not filtering by phase or employee' },
        { status: 400 }
      );
    }

    const assignments = await AssignmentService.getAssignmentsByDateRange(
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assignments
 * Create a new crew assignment
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and above can create assignments
    if (![UserRole.OWNER, UserRole.MANAGER, UserRole.PROJECT_MANAGER].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Convert date string to Date object
    if (body.assignmentDate) {
      body.assignmentDate = new Date(body.assignmentDate);
    }

    const assignment = await AssignmentService.createAssignment(body, user.id);
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Failed to create assignment:', error);
    const message = error instanceof Error ? error.message : 'Failed to create assignment';
    const status = message.includes('Conflict') ? 409 :
                  message.includes('Validation') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/assignments
 * Bulk create/update assignments
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and above can bulk manage assignments
    if (![UserRole.OWNER, UserRole.MANAGER, UserRole.PROJECT_MANAGER].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { phaseId, assignments } = body;

    if (!phaseId || !assignments || !Array.isArray(assignments)) {
      return NextResponse.json(
        { error: 'Phase ID and assignments array are required' },
        { status: 400 }
      );
    }

    // Convert date strings to Date objects
    const processedAssignments = assignments.map(a => ({
      ...a,
      assignmentDate: a.assignmentDate ? new Date(a.assignmentDate) : new Date()
    }));

    const results = await AssignmentService.bulkAssignCrew(phaseId, processedAssignments, user.id);
    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error('Failed to bulk create assignments:', error);
    const message = error instanceof Error ? error.message : 'Failed to create assignments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}