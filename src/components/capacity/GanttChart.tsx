'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ProjectPhase, Division, PhaseStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  ZoomIn,
  ZoomOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Filter
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isWeekend,
  isSameMonth,
  differenceInDays,
  addMonths,
  subMonths
} from 'date-fns';

interface GanttPhase extends ProjectPhase {
  project?: {
    id: string;
    projectCode: string;
    name: string;
  };
}

interface GanttChartProps {
  phases: GanttPhase[];
  startDate?: Date;
  endDate?: Date;
  division?: Division;
  onPhaseClick?: (phase: GanttPhase) => void;
}

type ZoomLevel = '3months' | '6months' | '1year' | '2years';

const ZOOM_CONFIGS: Record<ZoomLevel, { months: number; label: string; dayWidth: number }> = {
  '3months': { months: 3, label: '3 Months', dayWidth: 12 },
  '6months': { months: 6, label: '6 Months', dayWidth: 6 },
  '1year': { months: 12, label: '1 Year', dayWidth: 3 },
  '2years': { months: 24, label: '2 Years', dayWidth: 1.5 }
};

export function GanttChart({
  phases,
  startDate: propStartDate,
  endDate: propEndDate,
  division,
  onPhaseClick
}: GanttChartProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('6months');
  const [viewStartDate, setViewStartDate] = useState<Date>(
    propStartDate || startOfMonth(new Date())
  );
  const [selectedStatus, setSelectedStatus] = useState<PhaseStatus | 'ALL'>('ALL');
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const zoomConfig = ZOOM_CONFIGS[zoomLevel];
  const viewEndDate = addMonths(viewStartDate, zoomConfig.months);

  // Filter phases
  const filteredPhases = phases.filter(phase => {
    if (division && phase.division !== division) return false;
    if (selectedStatus !== 'ALL' && phase.status !== selectedStatus) return false;

    // Check if phase overlaps with view window
    return phase.endDate >= viewStartDate && phase.startDate <= viewEndDate;
  });

  // Group phases by project
  const phasesByProject = filteredPhases.reduce((acc, phase) => {
    const projectId = phase.projectId;
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(phase);
    return acc;
  }, {} as Record<string, GanttPhase[]>);

  // Calculate timeline
  const days = eachDayOfInterval({ start: viewStartDate, end: viewEndDate });
  const weeks = eachWeekOfInterval({ start: viewStartDate, end: viewEndDate });
  const months = eachMonthOfInterval({ start: viewStartDate, end: viewEndDate });

  const totalDays = differenceInDays(viewEndDate, viewStartDate);
  const chartWidth = totalDays * zoomConfig.dayWidth;

  // Navigation functions
  const navigatePrevious = () => {
    setViewStartDate(subMonths(viewStartDate, Math.floor(zoomConfig.months / 2)));
  };

  const navigateNext = () => {
    setViewStartDate(addMonths(viewStartDate, Math.floor(zoomConfig.months / 2)));
  };

  const navigateToToday = () => {
    setViewStartDate(startOfMonth(new Date()));
  };

  // Calculate phase position and width
  const getPhaseStyle = (phase: GanttPhase) => {
    const phaseStart = phase.startDate > viewStartDate ? phase.startDate : viewStartDate;
    const phaseEnd = phase.endDate < viewEndDate ? phase.endDate : viewEndDate;

    const leftOffset = differenceInDays(phaseStart, viewStartDate) * zoomConfig.dayWidth;
    const width = differenceInDays(phaseEnd, phaseStart) * zoomConfig.dayWidth;

    return {
      left: `${leftOffset}px`,
      width: `${Math.max(width, 20)}px` // Minimum width for visibility
    };
  };

  // Get phase color based on status
  const getPhaseColor = (phase: GanttPhase) => {
    const colors: Record<PhaseStatus, string> = {
      [PhaseStatus.NOT_STARTED]: 'bg-gray-400',
      [PhaseStatus.IN_PROGRESS]: 'bg-blue-500',
      [PhaseStatus.COMPLETED]: 'bg-green-500',
      [PhaseStatus.DELAYED]: 'bg-orange-500',
      [PhaseStatus.BLOCKED]: 'bg-red-500'
    };
    return colors[phase.status] || 'bg-gray-400';
  };

  // Get division color
  const getDivisionColor = (div: Division) => {
    if (div.startsWith('PLUMBING')) return 'border-blue-600';
    if (div.startsWith('HVAC')) return 'border-orange-600';
    return 'border-gray-600';
  };

  // Scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const today = new Date();
      const todayOffset = differenceInDays(today, viewStartDate) * zoomConfig.dayWidth;
      scrollContainerRef.current.scrollLeft = Math.max(0, todayOffset - 400);
    }
  }, [viewStartDate, zoomConfig.dayWidth]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline
          </CardTitle>

          <div className="flex items-center gap-4">
            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as PhaseStatus | 'ALL')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={PhaseStatus.NOT_STARTED}>Not Started</SelectItem>
                <SelectItem value={PhaseStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={PhaseStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={PhaseStatus.DELAYED}>Delayed</SelectItem>
                <SelectItem value={PhaseStatus.BLOCKED}>Blocked</SelectItem>
              </SelectContent>
            </Select>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const levels: ZoomLevel[] = ['3months', '6months', '1year', '2years'];
                  const currentIndex = levels.indexOf(zoomLevel);
                  if (currentIndex > 0) {
                    setZoomLevel(levels[currentIndex - 1]);
                  }
                }}
                disabled={zoomLevel === '3months'}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Select value={zoomLevel} onValueChange={(value) => setZoomLevel(value as ZoomLevel)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                  <SelectItem value="2years">2 Years</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const levels: ZoomLevel[] = ['3months', '6months', '1year', '2years'];
                  const currentIndex = levels.indexOf(zoomLevel);
                  if (currentIndex < levels.length - 1) {
                    setZoomLevel(levels[currentIndex + 1]);
                  }
                }}
                disabled={zoomLevel === '2years'}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={navigateToToday}>
                Today
              </Button>
              <Button size="sm" variant="outline" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative overflow-hidden">
          {/* Timeline Header */}
          <div className="sticky top-0 z-10 bg-white border-b">
            <div className="flex">
              <div className="w-48 flex-shrink-0 p-2 border-r bg-gray-50">
                <span className="font-semibold text-sm">Project / Phase</span>
              </div>
              <div className="overflow-x-auto" style={{ width: `calc(100% - 12rem)` }}>
                <div style={{ width: `${chartWidth}px`, height: '60px' }}>
                  {/* Month Headers */}
                  <div className="h-8 border-b flex">
                    {months.map((month, index) => {
                      const monthStart = startOfMonth(month);
                      const monthEnd = endOfMonth(month);
                      const monthStartInView = monthStart > viewStartDate ? monthStart : viewStartDate;
                      const monthEndInView = monthEnd < viewEndDate ? monthEnd : viewEndDate;
                      const monthDays = differenceInDays(monthEndInView, monthStartInView) + 1;
                      const monthWidth = monthDays * zoomConfig.dayWidth;

                      return (
                        <div
                          key={index}
                          className="border-r px-1 text-center text-sm font-medium"
                          style={{ width: `${monthWidth}px` }}
                        >
                          {format(month, 'MMM yyyy')}
                        </div>
                      );
                    })}
                  </div>

                  {/* Day/Week Grid based on zoom */}
                  {zoomConfig.dayWidth >= 6 && (
                    <div className="h-7 flex">
                      {days.map((day, index) => (
                        <div
                          key={index}
                          className={`border-r text-xs text-center ${
                            isWeekend(day) ? 'bg-gray-50' : ''
                          }`}
                          style={{ width: `${zoomConfig.dayWidth}px` }}
                        >
                          {zoomConfig.dayWidth >= 10 ? format(day, 'd') : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Gantt Chart Body */}
          <div className="relative">
            <div className="flex">
              <div className="w-48 flex-shrink-0 border-r">
                {Object.entries(phasesByProject).map(([projectId, projectPhases]) => {
                  const project = projectPhases[0]?.project;
                  return (
                    <div key={projectId}>
                      {/* Project Header */}
                      <div className="p-2 bg-gray-50 border-b font-medium text-sm">
                        {project ? `${project.projectCode}: ${project.name}` : 'Unknown Project'}
                      </div>
                      {/* Phase Rows */}
                      {projectPhases.map(phase => (
                        <div
                          key={phase.id}
                          className="p-2 border-b text-sm hover:bg-gray-50 cursor-pointer"
                          onClick={() => onPhaseClick?.(phase)}
                        >
                          <div className="truncate">
                            Phase {phase.phaseNumber}: {phase.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {phase.requiredCrewSize} crew
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div
                ref={scrollContainerRef}
                className="overflow-x-auto"
                style={{ width: `calc(100% - 12rem)` }}
              >
                <div style={{ width: `${chartWidth}px`, position: 'relative' }}>
                  {/* Grid Lines */}
                  <div className="absolute inset-0">
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className={`absolute top-0 bottom-0 border-l ${
                          isWeekend(day) ? 'bg-gray-50' : ''
                        } ${
                          day.getDate() === 1 ? 'border-gray-400' : 'border-gray-200'
                        }`}
                        style={{ left: `${index * zoomConfig.dayWidth}px` }}
                      />
                    ))}

                    {/* Today Line */}
                    {new Date() >= viewStartDate && new Date() <= viewEndDate && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                        style={{
                          left: `${differenceInDays(new Date(), viewStartDate) * zoomConfig.dayWidth}px`
                        }}
                      >
                        <div className="absolute -top-2 -left-8 bg-red-500 text-white text-xs px-1 rounded">
                          Today
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phase Bars */}
                  {Object.entries(phasesByProject).map(([projectId, projectPhases]) => (
                    <div key={projectId}>
                      {/* Project Header Spacer */}
                      <div style={{ height: '41px' }} />
                      {/* Phase Bars */}
                      {projectPhases.map(phase => (
                        <div
                          key={phase.id}
                          className="relative"
                          style={{ height: '57px' }}
                        >
                          <div
                            className={`absolute top-2 h-8 rounded cursor-pointer transition-all ${getPhaseColor(
                              phase
                            )} ${getDivisionColor(phase.division)} border-2 hover:opacity-80`}
                            style={getPhaseStyle(phase)}
                            onClick={() => onPhaseClick?.(phase)}
                            onMouseEnter={() => setHoveredPhase(phase.id)}
                            onMouseLeave={() => setHoveredPhase(null)}
                          >
                            <div className="px-1 py-1 text-xs text-white truncate">
                              {zoomConfig.dayWidth >= 6 && phase.name}
                            </div>
                            {/* Progress Bar */}
                            {phase.progressPercentage > 0 && (
                              <div
                                className="absolute bottom-0 left-0 h-1 bg-green-300"
                                style={{ width: `${phase.progressPercentage}%` }}
                              />
                            )}
                          </div>

                          {/* Tooltip */}
                          {hoveredPhase === phase.id && (
                            <div className="absolute z-30 bg-gray-900 text-white p-2 rounded text-xs"
                              style={{
                                top: '40px',
                                left: getPhaseStyle(phase).left,
                                minWidth: '200px'
                              }}
                            >
                              <div className="font-semibold">{phase.name}</div>
                              <div>Status: {phase.status}</div>
                              <div>Progress: {phase.progressPercentage}%</div>
                              <div>
                                {format(phase.startDate, 'MMM d')} - {format(phase.endDate, 'MMM d, yyyy')}
                              </div>
                              <div>Crew: {phase.requiredCrewSize}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-6 text-sm">
            <span className="font-medium">Status:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-400 rounded" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-500 rounded" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-500 rounded" />
              <span>Delayed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span>Blocked</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}