import { NextRequest, NextResponse } from 'next/server';
import { EmployeeService } from '@/services/employees/EmployeeService';
import { verifyAuth } from '@/lib/auth/verify';
import { hasPermission } from '@/lib/auth/rbac';
import { Division } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, 'VIEW_EMPLOYEES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const division = searchParams.get('division') as Division | null;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const employees = await EmployeeService.getAvailableEmployees(
      new Date(startDate),
      new Date(endDate),
      division || undefined
    );

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching available employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available employees' },
      { status: 500 }
    );
  }
}