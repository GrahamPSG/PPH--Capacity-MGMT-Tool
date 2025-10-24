import { NextRequest, NextResponse } from 'next/server';
import { PhaseService } from '@/services/phases/PhaseService';
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

    if (!hasPermission(user.role, 'VIEW_PROJECTS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const phases = await PhaseService.getProjectPhases(params.id);

    return NextResponse.json(phases);
  } catch (error) {
    console.error('Error fetching project phases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project phases' },
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

    if (!hasPermission(user.role, 'CREATE_PHASES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    body.projectId = params.id;

    // Convert date strings to Date objects
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    if (body.actualStartDate) body.actualStartDate = new Date(body.actualStartDate);
    if (body.actualEndDate) body.actualEndDate = new Date(body.actualEndDate);

    const phase = await PhaseService.createPhase(body, user.id);

    return NextResponse.json(phase, { status: 201 });
  } catch (error: any) {
    console.error('Error creating phase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create phase' },
      { status: 400 }
    );
  }
}