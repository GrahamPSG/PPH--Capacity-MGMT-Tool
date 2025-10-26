'use client';

import React, { useState } from 'react';
import { ProjectPhase, PhaseStatus, Division } from '@prisma/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Pause,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';

interface PhaseWithRelations extends ProjectPhase {
  project?: {
    name: string;
    projectCode: string;
  };
  assignments?: Array<{
    id: string;
    employee: {
      firstName: string;
      lastName: string;
    };
  }>;
  _count?: {
    assignments: number;
  };
}

interface PhaseListProps {
  phases: PhaseWithRelations[];
  onEdit?: (phase: PhaseWithRelations) => void;
  onDelete?: (phaseId: string) => void;
  onManageCrew?: (phaseId: string) => void;
  onUpdateProgress?: (phaseId: string, progress: number) => void;
  isLoading?: boolean;
  showProject?: boolean;
}

export function PhaseList({
  phases,
  onEdit,
  onDelete,
  onManageCrew,
  onUpdateProgress,
  isLoading = false,
  showProject = false
}: PhaseListProps) {
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set());

  const getStatusIcon = (status: PhaseStatus) => {
    switch (status) {
      case PhaseStatus.NOT_STARTED:
        return <Clock className="h-4 w-4 text-gray-500" />;
      case PhaseStatus.IN_PROGRESS:
        return <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />;
      case PhaseStatus.COMPLETED:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case PhaseStatus.DELAYED:
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case PhaseStatus.BLOCKED:
        return <Lock className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: PhaseStatus) => {
    const colors: Record<PhaseStatus, string> = {
      [PhaseStatus.NOT_STARTED]: 'bg-gray-500',
      [PhaseStatus.IN_PROGRESS]: 'bg-blue-500',
      [PhaseStatus.COMPLETED]: 'bg-green-500',
      [PhaseStatus.DELAYED]: 'bg-orange-500',
      [PhaseStatus.BLOCKED]: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getDivisionColor = (division: Division) => {
    if (division.startsWith('PLUMBING')) return 'text-blue-600';
    if (division.startsWith('HVAC')) return 'text-orange-600';
    return 'text-gray-600';
  };

  const calculateDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const togglePhaseSelection = (phaseId: string) => {
    const newSelected = new Set(selectedPhases);
    if (newSelected.has(phaseId)) {
      newSelected.delete(phaseId);
    } else {
      newSelected.add(phaseId);
    }
    setSelectedPhases(newSelected);
  };

  const selectAllPhases = () => {
    if (selectedPhases.size === phases.length) {
      setSelectedPhases(new Set());
    } else {
      setSelectedPhases(new Set(phases.map(p => p.id)));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading phases...</div>
        </CardContent>
      </Card>
    );
  }

  if (phases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">No phases found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Phases</CardTitle>
          {selectedPhases.size > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Bulk update selected phases
                  console.log('Bulk update:', Array.from(selectedPhases));
                }}
              >
                Update {selectedPhases.size} phases
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  // Bulk delete selected phases
                  console.log('Bulk delete:', Array.from(selectedPhases));
                }}
              >
                Delete {selectedPhases.size} phases
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    checked={selectedPhases.size === phases.length && phases.length > 0}
                    onChange={selectAllPhases}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                <TableHead className="w-[60px]">#</TableHead>
                {showProject && <TableHead>Project</TableHead>}
                <TableHead>Phase Name</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Crew</TableHead>
                <TableHead>Labor Hours</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phases.map((phase) => {
                const daysRemaining = calculateDaysRemaining(phase.endDate);
                const isDelayed = daysRemaining < 0 && phase.status !== PhaseStatus.COMPLETED;

                return (
                  <TableRow key={phase.id} className={isDelayed ? 'bg-red-50' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedPhases.has(phase.id)}
                        onChange={() => togglePhaseSelection(phase.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {phase.phaseNumber}
                    </TableCell>
                    {showProject && (
                      <TableCell>
                        {phase.project ? (
                          <div>
                            <div className="font-medium">{phase.project.projectCode}</div>
                            <div className="text-sm text-gray-500">{phase.project.name}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="max-w-[200px]">
                        <div className="font-medium truncate" title={phase.name}>
                          {phase.name}
                        </div>
                        {phase.dependencies && phase.dependencies.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {phase.dependencies.length} dependencies
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getDivisionColor(phase.division)}`}>
                        {phase.division.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(phase.status)}
                        <Badge className={getStatusColor(phase.status)}>
                          {phase.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <Progress value={phase.progressPercentage} className="h-2" />
                        <div className="text-xs text-gray-500 mt-1">
                          {phase.progressPercentage}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(phase.startDate), 'MMM d')}</div>
                        <div className="text-gray-500">
                          to {format(new Date(phase.endDate), 'MMM d')}
                        </div>
                        {isDelayed && (
                          <div className="text-red-600 text-xs mt-1">
                            {Math.abs(daysRemaining)} days overdue
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {phase.requiredCrewSize > 0 ? (
                          <>
                            <div className="font-medium">{phase.requiredCrewSize} total</div>
                            <div className="text-xs text-gray-500">
                              {phase.requiredForeman && 'F '}
                              {phase.requiredJourneymen > 0 && `${phase.requiredJourneymen}J `}
                              {phase.requiredApprentices > 0 && `${phase.requiredApprentices}A`}
                            </div>
                            {phase._count && (
                              <div className="text-xs mt-1">
                                {phase._count.assignments} assigned
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">No crew</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {phase.laborHours > 0 ? (
                        <div className="text-sm">
                          <div className="font-medium">{phase.laborHours}h</div>
                          {phase.actualStartDate && (
                            <div className="text-xs text-gray-500">
                              {/* Calculate actual hours used */}
                              Tracking...
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {onUpdateProgress && (
                            <DropdownMenuItem
                              onClick={() => {
                                const newProgress = prompt(
                                  `Update progress for ${phase.name} (current: ${phase.progressPercentage}%):`,
                                  String(phase.progressPercentage)
                                );
                                if (newProgress) {
                                  const progress = parseInt(newProgress);
                                  if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                                    onUpdateProgress(phase.id, progress);
                                  }
                                }
                              }}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Update Progress
                            </DropdownMenuItem>
                          )}
                          {onManageCrew && (
                            <DropdownMenuItem
                              onClick={() => onManageCrew(phase.id)}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Manage Crew
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(phase)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Phase
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {phase.status === PhaseStatus.NOT_STARTED && (
                            <DropdownMenuItem>
                              <Calendar className="mr-2 h-4 w-4" />
                              Start Phase
                            </DropdownMenuItem>
                          )}
                          {phase.status === PhaseStatus.IN_PROGRESS && (
                            <>
                              <DropdownMenuItem>
                                <Pause className="mr-2 h-4 w-4" />
                                Put On Hold
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark Complete
                              </DropdownMenuItem>
                            </>
                          )}
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Delete phase "${phase.name}"?`)) {
                                    onDelete(phase.id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Phase
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}