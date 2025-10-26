import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file || !projectId) {
      return NextResponse.json({ error: 'File and projectId required' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    // Skip header row
    const dataLines = lines.slice(1);

    const phases = dataLines.map((line, index) => {
      const [phaseName, startDate, endDate, crewSize, needsForeman, journeymen, apprentices] = line.split(',').map(s => s.trim());

      return {
        projectId,
        phaseName: phaseName || `Phase ${index + 1}`,
        phaseNumber: index + 1,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        crewSize: parseInt(crewSize) || 0,
        needsForeman: needsForeman?.toLowerCase() === 'yes' || needsForeman === '1',
        journeymen: parseInt(journeymen) || 0,
        apprentices: parseInt(apprentices) || 0
      };
    });

    // Delete existing phases for this project
    await prisma.phase.deleteMany({
      where: { projectId }
    });

    // Create new phases
    const result = await prisma.phase.createMany({
      data: phases
    });

    return NextResponse.json({
      success: true,
      created: result.count,
      message: `Successfully imported ${result.count} phases`
    });
  } catch (error: any) {
    console.error('Error uploading phases:', error);
    return NextResponse.json({
      error: 'Failed to upload phases',
      details: error.message
    }, { status: 500 });
  }
}

// Generate CSV template
export async function GET() {
  const template = `Phase Name,Start Date,End Date,Crew Size,Needs Foreman (Yes/No),Journeymen,Apprentices
Underground Rough-in,2024-03-01,2024-03-15,5,Yes,3,1
1st Floor Rough-in,2024-03-16,2024-03-30,4,Yes,2,1
2nd Floor Rough-in,2024-04-01,2024-04-15,4,Yes,2,1
Top Out,2024-04-16,2024-04-30,3,Yes,2,0
Fixture Installation,2024-05-01,2024-05-15,3,No,2,1`;

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="phase-template.csv"'
    }
  });
}