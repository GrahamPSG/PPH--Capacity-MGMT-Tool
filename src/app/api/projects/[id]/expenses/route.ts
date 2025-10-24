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

    if (!hasPermission(user.role, 'VIEW_EXPENSES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const result = await ProjectService.getProjectExpenses(params.id, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching project expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project expenses' },
      { status: 500 }
    );
  }
}