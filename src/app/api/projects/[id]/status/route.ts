import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/services/projects/ProjectService';
import { verifyAuth } from '@/lib/auth/verify';
import { hasPermission } from '@/lib/auth/rbac';
import { ProjectStatus } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'UPDATE_PROJECT_STATUS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      );
    }

    const project = await ProjectService.updateProjectStatus(
      params.id,
      status as ProjectStatus,
      user.id
    );

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update project status' },
      { status: 400 }
    );
  }
}