import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/client';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate project code
    const lastProject = await prisma.project.findFirst({
      orderBy: { projectCode: 'desc' }
    });

    let nextNumber = 1;
    if (lastProject?.projectCode) {
      const match = lastProject.projectCode.match(/PRJ-(\d+)/);
      if (match) nextNumber = parseInt(match[1]) + 1;
    }

    const projectCode = `PRJ-${nextNumber.toString().padStart(3, '0')}`;

    const project = await prisma.project.create({
      data: {
        ...body,
        projectCode,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate)
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}