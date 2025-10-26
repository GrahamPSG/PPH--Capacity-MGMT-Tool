import { NextRequest, NextResponse } from 'next/server';
import { PhaseService } from '@/services/phases/PhaseService';
import { verifyAuth } from '@/lib/auth/verify';
import { UserRole } from '@prisma/client';

/**
 * GET /api/phases
 * Get phases with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const division = searchParams.get('division');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filters = {
      projectId: projectId || undefined,
      status: status || undefined,
      division: division || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const phases = await PhaseService.getPhases(filters);
    return NextResponse.json(phases);
  } catch (error) {
    console.error('Failed to fetch phases:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch phases';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/phases
 * Create a new phase
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only PROJECT_MANAGER and above can create phases
    if (![UserRole.OWNER, UserRole.MANAGER, UserRole.PROJECT_MANAGER].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Convert date strings to Date objects
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    if (body.actualStartDate) body.actualStartDate = new Date(body.actualStartDate);
    if (body.actualEndDate) body.actualEndDate = new Date(body.actualEndDate);

    const phase = await PhaseService.createPhase(body, user.id);
    return NextResponse.json(phase, { status: 201 });
  } catch (error) {
    console.error('Failed to create phase:', error);
    const message = error instanceof Error ? error.message : 'Failed to create phase';
    const status = message.includes('Validation') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/phases/bulk
 * Create multiple phases at once
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only PROJECT_MANAGER and above can create phases
    if (![UserRole.OWNER, UserRole.MANAGER, UserRole.PROJECT_MANAGER].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, phases } = body;

    if (!projectId || !phases || !Array.isArray(phases)) {
      return NextResponse.json(
        { error: 'Project ID and phases array are required' },
        { status: 400 }
      );
    }

    // Convert date strings to Date objects for each phase
    const processedPhases = phases.map(phase => ({
      ...phase,
      startDate: phase.startDate ? new Date(phase.startDate) : undefined,
      endDate: phase.endDate ? new Date(phase.endDate) : undefined,
      actualStartDate: phase.actualStartDate ? new Date(phase.actualStartDate) : undefined,
      actualEndDate: phase.actualEndDate ? new Date(phase.actualEndDate) : undefined,
    }));

    const createdPhases = await PhaseService.createBulkPhases(projectId, processedPhases, user.id);
    return NextResponse.json(createdPhases, { status: 201 });
  } catch (error) {
    console.error('Failed to create phases:', error);
    const message = error instanceof Error ? error.message : 'Failed to create phases';
    const status = message.includes('Validation') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}