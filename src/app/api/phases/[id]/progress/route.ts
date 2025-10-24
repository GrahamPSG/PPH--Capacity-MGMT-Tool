import { NextRequest, NextResponse } from 'next/server';
import { PhaseService } from '@/services/phases/PhaseService';
import { PhaseValidator } from '@/services/phases/PhaseValidator';
import { verifyAuth } from '@/lib/auth/verify';
import { hasPermission } from '@/lib/auth/rbac';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'UPDATE_PHASE_PROGRESS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = PhaseValidator.validateProgressUpdate(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const phase = await PhaseService.updatePhaseProgress(
      params.id,
      body.progressPercentage,
      user.id
    );

    return NextResponse.json(phase);
  } catch (error: any) {
    console.error('Error updating phase progress:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update phase progress' },
      { status: 400 }
    );
  }
}