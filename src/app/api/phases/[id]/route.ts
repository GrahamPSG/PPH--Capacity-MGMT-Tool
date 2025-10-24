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

    const phase = await PhaseService.getPhaseById(params.id);
    if (!phase) {
      return NextResponse.json(
        { error: 'Phase not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(phase);
  } catch (error) {
    console.error('Error fetching phase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phase' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'UPDATE_PHASES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Convert date strings to Date objects
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    if (body.actualStartDate !== undefined) {
      body.actualStartDate = body.actualStartDate ? new Date(body.actualStartDate) : null;
    }
    if (body.actualEndDate !== undefined) {
      body.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : null;
    }

    const phase = await PhaseService.updatePhase(params.id, body, user.id);

    if (!phase) {
      return NextResponse.json(
        { error: 'Phase not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(phase);
  } catch (error: any) {
    console.error('Error updating phase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update phase' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'DELETE_PHASES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await PhaseService.deletePhase(params.id, user.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error deleting phase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete phase' },
      { status: 400 }
    );
  }
}