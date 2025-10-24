import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/services/projects/ProjectService';
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

    const project = await ProjectService.getProjectById(params.id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
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

    if (!hasPermission(user.role, 'UPDATE_PROJECTS')) {
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

    const project = await ProjectService.updateProject(params.id, body, user.id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update project' },
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

    if (!hasPermission(user.role, 'DELETE_PROJECTS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await ProjectService.cancelProject(params.id, user.id);

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error('Error cancelling project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel project' },
      { status: 400 }
    );
  }
}