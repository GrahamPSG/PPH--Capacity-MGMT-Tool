'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays, differenceInDays, startOfWeek } from 'date-fns';

interface Project {
  id: string;
  name: string;
  division: string;
  startDate: Date;
  endDate: Date;
  status: 'QUOTED' | 'AWARDED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  foremanName?: string;
  progressPercentage: number;
}

interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progressPercentage: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'BLOCKED';
}

export function ProjectGanttChart() {
  // Mock data - will be replaced with real API calls
  const projects: Project[] = [
    {
      id: '1',
      name: 'Riverfront Towers - Building A',
      division: 'PLUMBING_MULTIFAMILY',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-15'),
      status: 'IN_PROGRESS',
      foremanName: 'John Smith',
      progressPercentage: 45,
    },
    {
      id: '2',
      name: 'Tech Campus HVAC Retrofit',
      division: 'HVAC_COMMERCIAL',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-04-30'),
      status: 'IN_PROGRESS',
      foremanName: 'Mike Johnson',
      progressPercentage: 20,
    },
    {
      id: '3',
      name: 'Custom Home - Westside',
      division: 'PLUMBING_CUSTOM',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-28'),
      status: 'AWARDED',
      foremanName: 'Sarah Davis',
      progressPercentage: 0,
    },
  ];

  const phases: ProjectPhase[] = [
    {
      id: '1-1',
      projectId: '1',
      name: 'Rough-in Phase',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      progressPercentage: 100,
      status: 'COMPLETED',
    },
    {
      id: '1-2',
      projectId: '1',
      name: 'Installation Phase',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-28'),
      progressPercentage: 40,
      status: 'IN_PROGRESS',
    },
    {
      id: '1-3',
      projectId: '1',
      name: 'Testing & Commissioning',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-15'),
      progressPercentage: 0,
      status: 'NOT_STARTED',
    },
  ];

  // Calculate timeline bounds
  const { startDate, endDate, weeks } = useMemo(() => {
    const allDates = projects.flatMap(p => [p.startDate, p.endDate]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    const start = startOfWeek(minDate);
    const end = addDays(maxDate, 7);
    const weekCount = Math.ceil(differenceInDays(end, start) / 7);

    const weekArray = Array.from({ length: weekCount }, (_, i) => {
      const weekStart = addDays(start, i * 7);
      return {
        start: weekStart,
        label: format(weekStart, 'MMM d'),
      };
    });

    return { startDate: start, endDate: end, weeks: weekArray };
  }, [projects]);

  const getPositionAndWidth = (itemStart: Date, itemEnd: Date) => {
    const totalDays = differenceInDays(endDate, startDate);
    const startOffset = differenceInDays(itemStart, startDate);
    const duration = differenceInDays(itemEnd, itemStart);

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      IN_PROGRESS: 'bg-blue-500',
      COMPLETED: 'bg-green-500',
      NOT_STARTED: 'bg-gray-300',
      DELAYED: 'bg-red-500',
      BLOCKED: 'bg-orange-500',
      AWARDED: 'bg-purple-500',
      ON_HOLD: 'bg-yellow-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      IN_PROGRESS: 'default',
      COMPLETED: 'secondary',
      DELAYED: 'destructive',
      BLOCKED: 'destructive',
    };
    return variants[status] || 'outline';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Project Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Timeline Header */}
            <div className="flex border-b pb-2 mb-4">
              <div className="w-64 shrink-0 font-medium text-sm">Project</div>
              <div className="flex-1 relative">
                <div className="flex">
                  {weeks.map((week, index) => (
                    <div
                      key={index}
                      className="flex-1 text-xs text-center text-muted-foreground border-l first:border-l-0"
                    >
                      {week.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Project Rows */}
            {projects.map((project) => (
              <div key={project.id} className="mb-6">
                {/* Project Bar */}
                <div className="flex items-center mb-2">
                  <div className="w-64 shrink-0 pr-4">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{project.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadge(project.status)} className="text-xs">
                          {project.status.replace('_', ' ')}
                        </Badge>
                        {project.foremanName && (
                          <span className="text-xs text-muted-foreground">
                            {project.foremanName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 relative h-10">
                    <div
                      className={`absolute h-full rounded-md ${getStatusColor(project.status)} opacity-30`}
                      style={getPositionAndWidth(project.startDate, project.endDate)}
                    />
                    <div
                      className={`absolute h-full rounded-md ${getStatusColor(project.status)}`}
                      style={{
                        ...getPositionAndWidth(project.startDate, project.endDate),
                        width: `${(project.progressPercentage / 100) * parseFloat(getPositionAndWidth(project.startDate, project.endDate).width)}%`,
                      }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-xs font-medium text-white px-2"
                      style={getPositionAndWidth(project.startDate, project.endDate)}
                    >
                      {project.progressPercentage}%
                    </div>
                  </div>
                </div>

                {/* Phase Bars */}
                {phases
                  .filter(phase => phase.projectId === project.id)
                  .map((phase) => (
                    <div key={phase.id} className="flex items-center mb-1 ml-4">
                      <div className="w-60 shrink-0 pr-4">
                        <div className="text-xs text-muted-foreground pl-4">
                          └─ {phase.name}
                        </div>
                      </div>
                      <div className="flex-1 relative h-6">
                        <div
                          className={`absolute h-full rounded ${getStatusColor(phase.status)} opacity-30`}
                          style={getPositionAndWidth(phase.startDate, phase.endDate)}
                        />
                        <div
                          className={`absolute h-full rounded ${getStatusColor(phase.status)}`}
                          style={{
                            ...getPositionAndWidth(phase.startDate, phase.endDate),
                            width: `${(phase.progressPercentage / 100) * parseFloat(getPositionAndWidth(phase.startDate, phase.endDate).width)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ))}

            {/* Today Line */}
            <div className="flex items-center mt-4">
              <div className="w-64 shrink-0"></div>
              <div className="flex-1 relative">
                <div
                  className="absolute h-full w-0.5 bg-red-500 z-10"
                  style={getPositionAndWidth(new Date(), new Date()).left}
                >
                  <div className="absolute -top-2 -left-6 text-xs text-red-500 font-medium">
                    Today
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className="text-xs">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-xs">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded" />
            <span className="text-xs">Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-xs">Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded" />
            <span className="text-xs">Awarded</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}