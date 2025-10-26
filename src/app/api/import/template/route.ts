import { NextRequest, NextResponse } from 'next/server';
import { CSVParser } from '@/services/import/CSVParser';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!type || !['projects', 'phases', 'employees'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid template type. Must be: projects, phases, or employees' },
        { status: 400 }
      );
    }

    let csvContent: string;
    let filename: string;

    switch (type) {
      case 'projects':
        csvContent = CSVParser.generateProjectTemplate();
        filename = 'projects_template.csv';
        break;
      case 'phases':
        csvContent = CSVParser.generatePhaseTemplate();
        filename = 'phases_template.csv';
        break;
      case 'employees':
        csvContent = CSVParser.generateEmployeeTemplate();
        filename = 'employees_template.csv';
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}