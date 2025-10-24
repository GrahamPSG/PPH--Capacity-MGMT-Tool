import { NextRequest, NextResponse } from 'next/server';
import { EmployeeService } from '@/services/employees/EmployeeService';
import { EmployeeValidator } from '@/services/employees/EmployeeValidator';
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
    const division = searchParams.get('division') as Division | null;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const employees = await EmployeeService.getAllEmployees(
      division || undefined,
      includeInactive
    );

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
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

    if (!hasPermission(user.role, 'CREATE_EMPLOYEES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = EmployeeValidator.validateCreate(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const employee = await EmployeeService.createEmployee(
      validation.data,
      user.id
    );

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}