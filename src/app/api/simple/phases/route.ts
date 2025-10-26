import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, phases } = body;

    // Bulk create phases
    const createdPhases = await prisma.phase.createMany({
      data: phases.map((phase: any, index: number) => ({
        projectId,
        phaseName: phase.phaseName,
        phaseNumber: index + 1,
        startDate: new Date(phase.startDate),
        endDate: new Date(phase.endDate),
        crewSize: phase.crewSize || 0,
        needsForeman: phase.needsForeman !== false,
        journeymen: phase.journeymen || 0,
        apprentices: phase.apprentices || 0
      }))
    });

    return NextResponse.json({ created: createdPhases.count });
  } catch (error) {
    console.error('Error creating phases:', error);
    return NextResponse.json({ error: 'Failed to create phases' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const phase = await prisma.phase.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(phase);
  } catch (error) {
    console.error('Error updating phase:', error);
    return NextResponse.json({ error: 'Failed to update phase' }, { status: 500 });
  }
}