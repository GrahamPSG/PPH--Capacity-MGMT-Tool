import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/services/projects/ProjectService';
import { verifyAuth } from '@/lib/auth/verify';
import { hasPermission } from '@/lib/auth/rbac';
import { ProjectType, ProjectStatus, Division } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'VIEW_PROJECTS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ProjectStatus | null;
    const division = searchParams.get('division') as Division | null;
    const foremanId = searchParams.get('foremanId');
    const type = searchParams.get('type') as ProjectType | null;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const filters: any = {};
    if (status) filters.status = status;
    if (division) filters.division = division;
    if (foremanId) filters.foremanId = foremanId;
    if (type) filters.type = type;

    const result = await ProjectService.getAllProjects(filters, page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'CREATE_PROJECTS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Convert date strings to Date objects
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    if (body.actualStartDate) body.actualStartDate = new Date(body.actualStartDate);
    if (body.actualEndDate) body.actualEndDate = new Date(body.actualEndDate);

    const project = await ProjectService.createProject(body, user.id);

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 400 }
    );
  }
}