'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import Link from 'next/link';

export interface ProjectData {
  id: string;
  name: string;
  division: string;
  status: 'QUOTED' | 'AWARDED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  progress: number;
  startDate?: Date;
  endDate?: Date;
  value: number;
  assignedEmployees: number;
  isAtRisk?: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  manager?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface ProjectCardProps {
  project: ProjectData;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  variant?: 'default' | 'compact';
  showActions?: boolean;
}

const statusColors: Record<string, string> = {
  QUOTED: 'bg-gray-100 text-gray-800',
  AWARDED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

const priorityColors: Record<string, string> = {
  LOW: 'border-gray-300',
  MEDIUM: 'border-blue-500',
  HIGH: 'border-orange-500',
  URGENT: 'border-red-500'
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onDelete,
  onView,
  variant = 'default',
  showActions = true
}) => {
  const getStatusBadge = () => {
    return (
      <Badge className={statusColors[project.status] || 'bg-gray-100'}>
        {project.status.replace('_', ' ')}
      </Badge>
    );
  };

  const getDaysRemaining = () => {
    if (!project.endDate) return null;
    const today = new Date();
    const end = new Date(project.endDate);
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day remaining';
    return `${days} days remaining`;
  };

  if (variant === 'compact') {
    return (
      <Card className={`hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${priorityColors[project.priority || 'MEDIUM']}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-sm truncate">{project.name}</h3>
              <p className="text-xs text-gray-600">{project.division}</p>
            </div>
            <div className="flex items-center gap-2">
              {project.isAtRisk && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              {getStatusBadge()}
            </div>
          </div>
          <div className="space-y-2">
            <Progress value={project.progress} className="h-1.5" />
            <div className="flex justify-between text-xs text-gray-600">
              <span>{project.progress}% complete</span>
              <span>${(project.value / 1000).toFixed(0)}k</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow border-l-4 ${priorityColors[project.priority || 'MEDIUM']}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-gray-500" />
              {project.name}
              {project.isAtRisk && (
                <AlertTriangle className="h-5 w-5 text-red-500" title="At Risk" />
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{project.division}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView?.(project.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(project.id)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete?.(project.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-gray-600">Timeline</p>
              <p className="font-medium">
                {project.startDate && format(new Date(project.startDate), 'MMM d')}
                {' - '}
                {project.endDate && format(new Date(project.endDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-gray-600">Value</p>
              <p className="font-medium">${project.value.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {project.assignedEmployees} assigned
            </span>
          </div>
          {getDaysRemaining() && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{getDaysRemaining()}</span>
            </div>
          )}
        </div>

        {/* Manager */}
        {project.manager && (
          <div className="flex items-center gap-2 pt-3 border-t">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
              {project.manager.avatar ? (
                <img
                  src={project.manager.avatar}
                  alt={project.manager.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                project.manager.name.split(' ').map(n => n[0]).join('')
              )}
            </div>
            <div>
              <p className="text-xs text-gray-600">Project Manager</p>
              <p className="text-sm font-medium">{project.manager.name}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onView?.(project.id)}
            >
              View Details
            </Button>
            <Link href={`/projects/${project.id}`} className="flex-1">
              <Button size="sm" className="w-full">
                Open Project
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};