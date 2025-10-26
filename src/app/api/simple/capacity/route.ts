import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/client';
import { Division } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division') as Division | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get all phases in date range
    const phases = await prisma.phase.findMany({
      where: {
        AND: [
          startDate ? { endDate: { gte: new Date(startDate) } } : {},
          endDate ? { startDate: { lte: new Date(endDate) } } : {},
          division ? { project: { division } } : {}
        ]
      },
      include: {
        project: true
      }
    });

    // Get employee counts by division
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        ...(division ? { division } : {})
      }
    });

    // Calculate monthly capacity
    const monthlyCapacity: any = {};

    phases.forEach(phase => {
      const monthKey = `${phase.startDate.getFullYear()}-${(phase.startDate.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!monthlyCapacity[monthKey]) {
        monthlyCapacity[monthKey] = {
          month: monthKey,
          plumbingDemand: 0,
          hvacDemand: 0,
          plumbingCapacity: 0,
          hvacCapacity: 0
        };
      }

      const laborDemand = phase.crewSize || (phase.needsForeman ? 1 : 0) + phase.journeymen + phase.apprentices;

      if (phase.project.division.startsWith('PLUMBING')) {
        monthlyCapacity[monthKey].plumbingDemand += laborDemand;
      } else {
        monthlyCapacity[monthKey].hvacDemand += laborDemand;
      }
    });

    // Add capacity (available employees * 160 hours/month)
    const plumbingEmployees = employees.filter(e => e.division.startsWith('PLUMBING')).length;
    const hvacEmployees = employees.filter(e => e.division.startsWith('HVAC')).length;

    Object.keys(monthlyCapacity).forEach(month => {
      monthlyCapacity[month].plumbingCapacity = plumbingEmployees * 160;
      monthlyCapacity[month].hvacCapacity = hvacEmployees * 160;
      monthlyCapacity[month].plumbingUtilization =
        monthlyCapacity[month].plumbingCapacity > 0
          ? (monthlyCapacity[month].plumbingDemand * 160 / monthlyCapacity[month].plumbingCapacity) * 100
          : 0;
      monthlyCapacity[month].hvacUtilization =
        monthlyCapacity[month].hvacCapacity > 0
          ? (monthlyCapacity[month].hvacDemand * 160 / monthlyCapacity[month].hvacCapacity) * 100
          : 0;
    });

    return NextResponse.json({
      capacity: Object.values(monthlyCapacity),
      summary: {
        totalPlumbingEmployees: plumbingEmployees,
        totalHvacEmployees: hvacEmployees,
        activeProjects: new Set(phases.map(p => p.projectId)).size,
        totalPhases: phases.length
      }
    });
  } catch (error) {
    console.error('Error calculating capacity:', error);
    return NextResponse.json({ error: 'Failed to calculate capacity' }, { status: 500 });
  }
}