'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  format,
  differenceInDays,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isSameDay,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut } from 'lucide-react';

export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string[];
  assignee?: string;
  color?: string;
  type: 'project' | 'phase' | 'task';
  children?: GanttTask[];
  isExpanded?: boolean;
}

interface ProjectGanttChartProps {
  tasks: GanttTask[];
  startDate?: Date;
  endDate?: Date;
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  showDependencies?: boolean;
  showProgress?: boolean;
  showAssignees?: boolean;
  viewMode?: 'day' | 'week' | 'month';
}

const defaultColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4'  // cyan
];

export const ProjectGanttChart: React.FC<ProjectGanttChartProps> = ({
  tasks,
  startDate,
  endDate,
  onTaskClick,
  onTaskUpdate,
  showDependencies = true,
  showProgress = true,
  showAssignees = true,
  viewMode = 'week'
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [expandedTasks, setExpandedTasks] = React.useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);

  // Calculate chart boundaries
  const chartBounds = useMemo(() => {
    if (startDate && endDate) {
      return { start: startDate, end: endDate };
    }

    let minDate = new Date();
    let maxDate = new Date();

    const processTask = (task: GanttTask) => {
      if (task.start < minDate) minDate = task.start;
      if (task.end > maxDate) maxDate = task.end;
      task.children?.forEach(processTask);
    };

    tasks.forEach(processTask);

    // Add padding
    minDate = addDays(minDate, -7);
    maxDate = addDays(maxDate, 7);

    return {
      start: startOfMonth(minDate),
      end: endOfMonth(maxDate)
    };
  }, [tasks, startDate, endDate]);

  // Generate timeline days
  const timelineDays = useMemo(() => {
    return eachDayOfInterval({
      start: chartBounds.start,
      end: chartBounds.end
    });
  }, [chartBounds]);

  // Flatten tasks for display
  const displayTasks = useMemo(() => {
    const result: (GanttTask & { level: number })[] = [];

    const addTask = (task: GanttTask, level: number) => {
      result.push({ ...task, level });
      if (task.children && expandedTasks.has(task.id)) {
        task.children.forEach(child => addTask(child, level + 1));
      }
    };

    tasks.forEach(task => addTask(task, 0));
    return result;
  }, [tasks, expandedTasks]);

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getTaskPosition = (task: GanttTask) => {
    const totalDays = differenceInDays(chartBounds.end, chartBounds.start) + 1;
    const startOffset = differenceInDays(task.start, chartBounds.start);
    const duration = differenceInDays(task.end, task.start) + 1;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  };

  const getCellWidth = () => {
    switch (viewMode) {
      case 'day': return 40 * zoom;
      case 'week': return 120 * zoom;
      case 'month': return 200 * zoom;
      default: return 120 * zoom;
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => addDays(prev, -30));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addDays(prev, 30));
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex">
          {/* Task list sidebar */}
          <div className="w-80 border-r">
            <div className="bg-gray-50 p-4 border-b font-semibold">
              Tasks
            </div>
            <ScrollArea className="h-96">
              {displayTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`
                    flex items-center gap-2 px-4 py-2 border-b hover:bg-gray-50 cursor-pointer
                    ${selectedTask === task.id ? 'bg-blue-50' : ''}
                  `}
                  style={{ paddingLeft: `${task.level * 20 + 16}px` }}
                  onClick={() => {
                    setSelectedTask(task.id);
                    onTaskClick?.(task);
                  }}
                >
                  {task.children && task.children.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskExpansion(task.id);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedTasks.has(task.id) ? '▼' : '▶'}
                    </button>
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task.name}</div>
                    {showAssignees && task.assignee && (
                      <div className="text-xs text-gray-500">{task.assignee}</div>
                    )}
                  </div>
                  {task.type === 'project' && (
                    <Badge variant="outline" className="text-xs">
                      Project
                    </Badge>
                  )}
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-max">
              {/* Timeline header */}
              <div className="bg-gray-50 border-b">
                <div className="flex">
                  {timelineDays.map((day, index) => {
                    const isWeekendDay = isWeekend(day);
                    const isTodayDay = isToday(day);
                    const cellWidth = getCellWidth();

                    if (viewMode === 'month' && day.getDate() !== 1) return null;
                    if (viewMode === 'week' && day.getDay() !== 1) return null;

                    return (
                      <div
                        key={index}
                        className={`
                          border-r text-center py-2 text-xs
                          ${isWeekendDay ? 'bg-gray-100' : ''}
                          ${isTodayDay ? 'bg-blue-100 font-bold' : ''}
                        `}
                        style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }}
                      >
                        <div>{format(day, 'MMM')}</div>
                        <div className="font-semibold">{format(day, 'd')}</div>
                        {viewMode === 'day' && (
                          <div className="text-gray-500">{format(day, 'EEE')}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Task bars */}
              <ScrollArea className="h-96">
                {displayTasks.map((task, taskIndex) => {
                  const position = getTaskPosition(task);
                  const color = task.color || defaultColors[taskIndex % defaultColors.length];

                  return (
                    <div
                      key={task.id}
                      className="relative h-10 border-b flex items-center"
                    >
                      <div className="absolute inset-0 flex">
                        {timelineDays.map((day, index) => {
                          const isWeekendDay = isWeekend(day);
                          const isTodayDay = isToday(day);
                          const cellWidth = getCellWidth();

                          if (viewMode === 'month' && day.getDate() !== 1) return null;
                          if (viewMode === 'week' && day.getDay() !== 1) return null;

                          return (
                            <div
                              key={index}
                              className={`
                                border-r h-full
                                ${isWeekendDay ? 'bg-gray-50' : ''}
                                ${isTodayDay ? 'bg-blue-50' : ''}
                              `}
                              style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }}
                            />
                          );
                        })}
                      </div>

                      {/* Task bar */}
                      <div
                        className="absolute h-6 rounded cursor-pointer transition-all hover:shadow-lg z-10"
                        style={{
                          left: position.left,
                          width: position.width,
                          backgroundColor: color,
                          opacity: task.type === 'project' ? 0.8 : 0.9
                        }}
                        onClick={() => {
                          setSelectedTask(task.id);
                          onTaskClick?.(task);
                        }}
                      >
                        {showProgress && (
                          <div
                            className="h-full bg-black bg-opacity-20 rounded"
                            style={{ width: `${task.progress}%` }}
                          />
                        )}
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-xs text-white font-medium truncate">
                            {task.name}
                          </span>
                        </div>
                      </div>

                      {/* Dependencies */}
                      {showDependencies && task.dependencies && task.dependencies.map(depId => {
                        const depTask = displayTasks.find(t => t.id === depId);
                        if (!depTask) return null;

                        const depPosition = getTaskPosition(depTask);

                        return (
                          <svg
                            key={depId}
                            className="absolute inset-0 pointer-events-none"
                            style={{ zIndex: 5 }}
                          >
                            <line
                              x1={`calc(${depPosition.left} + ${depPosition.width})`}
                              y1="20"
                              x2={position.left}
                              y2="20"
                              stroke="#94a3b8"
                              strokeWidth="2"
                              markerEnd="url(#arrowhead)"
                            />
                            <defs>
                              <marker
                                id="arrowhead"
                                markerWidth="10"
                                markerHeight="10"
                                refX="10"
                                refY="5"
                                orient="auto"
                              >
                                <polygon
                                  points="0 0, 10 5, 0 10"
                                  fill="#94a3b8"
                                />
                              </marker>
                            </defs>
                          </svg>
                        );
                      })}
                    </div>
                  );
                })}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded" />
              <span>Project</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>Phase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded" />
              <span>Task</span>
            </div>
            {showProgress && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 bg-gray-300 rounded relative">
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-gray-600 rounded-l" />
                </div>
                <span>Progress</span>
              </div>
            )}
            {showDependencies && (
              <div className="flex items-center gap-2">
                <svg width="20" height="10">
                  <line x1="0" y1="5" x2="15" y2="5" stroke="#94a3b8" strokeWidth="2" />
                  <polygon points="15,5 20,5 17.5,0" fill="#94a3b8" />
                </svg>
                <span>Dependency</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};