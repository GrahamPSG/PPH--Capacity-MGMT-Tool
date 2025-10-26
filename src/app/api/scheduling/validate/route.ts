import { NextRequest, NextResponse } from 'next/server';
import { ConflictDetectionService } from '@/services/scheduling/ConflictDetectionService';
import { withAuth } from '@/lib/auth/middleware';

const conflictService = new ConflictDetectionService();

/**
 * POST /api/scheduling/validate
 * Validate an assignment before creation
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { phaseId, employeeId, assignmentDate, hoursAllocated } = body;

    // Validate required fields
    if (!phaseId || !employeeId || !assignmentDate || !hoursAllocated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    // Validate the assignment
    const validationResult = await conflictService.validateAssignment(
      phaseId,
      employeeId,
      new Date(assignmentDate),
      hoursAllocated
    );

    // Return validation result with appropriate status
    const status = validationResult.isValid ? 200 : 409; // 409 Conflict

    return NextResponse.json(
      {
        success: validationResult.isValid,
        ...validationResult,
      },
      { status }
    );
  } catch (error) {
    console.error('Error validating assignment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate assignment',
      },
      { status: 500 }
    );
  }
});