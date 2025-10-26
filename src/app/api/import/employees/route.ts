import { NextRequest, NextResponse } from 'next/server';
import { DataImporter } from '@/services/import/DataImporter';
import { verifyAuth } from '@/services/auth/AuthService';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and above can import data
    if (![UserRole.OWNER, UserRole.MANAGER].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();

    // Validate first
    const validation = await DataImporter.validateImport(csvContent, 'employees');

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Import the data
    const result = await DataImporter.importEmployees(csvContent, user.id);

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Import failed',
          details: result.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: result.imported.employees,
      failed: result.failed.employees,
      warnings: validation.warnings
    });
  } catch (error) {
    console.error('Error importing employees:', error);
    return NextResponse.json(
      { error: 'Failed to import employees' },
      { status: 500 }
    );
  }
}