'use client';

import React, { useState } from 'react';
import { Project, ProjectStatus, Division } from '@prisma/client';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  FileText,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface ProjectWithDetails extends Project {
  foreman?: {
    firstName: string;
    lastName: string;
  } | null;
  _count?: {
    phases: number;
  };
}

interface ProjectListProps {
  projects: ProjectWithDetails[];
  onEdit?: (project: ProjectWithDetails) => void;
  onDelete?: (projectId: string) => void;
  isLoading?: boolean;
}

export function ProjectList({ projects, onEdit, onDelete, isLoading = false }: ProjectListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'ALL'>('ALL');

  // Filter projects based on search and filters
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchTerm === '' ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
    const matchesDivision = divisionFilter === 'ALL' || project.division === divisionFilter;

    return matchesSearch && matchesStatus && matchesDivision;
  });

  const getStatusColor = (status: ProjectStatus) => {
    const colors: Record<ProjectStatus, string> = {
      [ProjectStatus.QUOTED]: 'bg-gray-500',
      [ProjectStatus.AWARDED]: 'bg-blue-500',
      [ProjectStatus.IN_PROGRESS]: 'bg-green-500',
      [ProjectStatus.ON_HOLD]: 'bg-yellow-500',
      [ProjectStatus.COMPLETED]: 'bg-purple-500',
      [ProjectStatus.CANCELLED]: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getDivisionColor = (division: Division) => {
    if (division.startsWith('PLUMBING')) return 'bg-blue-600';
    if (division.startsWith('HVAC')) return 'bg-orange-600';
    return 'bg-gray-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Projects</CardTitle>
          <Button onClick={() => router.push('/projects/new')}>
            Create Project
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'ALL')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value={ProjectStatus.QUOTED}>Quoted</SelectItem>
              <SelectItem value={ProjectStatus.AWARDED}>Awarded</SelectItem>
              <SelectItem value={ProjectStatus.IN_PROGRESS}>In Progress</SelectItem>
              <SelectItem value={ProjectStatus.ON_HOLD}>On Hold</SelectItem>
              <SelectItem value={ProjectStatus.COMPLETED}>Completed</SelectItem>
              <SelectItem value={ProjectStatus.CANCELLED}>Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={divisionFilter} onValueChange={(value) => setDivisionFilter(value as Division | 'ALL')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Divisions</SelectItem>
              <SelectItem value={Division.PLUMBING_MULTIFAMILY}>Plumbing - Multifamily</SelectItem>
              <SelectItem value={Division.PLUMBING_COMMERCIAL}>Plumbing - Commercial</SelectItem>
              <SelectItem value={Division.PLUMBING_CUSTOM}>Plumbing - Custom</SelectItem>
              <SelectItem value={Division.HVAC_MULTIFAMILY}>HVAC - Multifamily</SelectItem>
              <SelectItem value={Division.HVAC_COMMERCIAL}>HVAC - Commercial</SelectItem>
              <SelectItem value={Division.HVAC_CUSTOM}>HVAC - Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading projects...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No projects found matching your criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Foreman</TableHead>
                  <TableHead>Phases</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="font-medium">{project.projectCode}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={project.name}>
                        {project.name}
                      </div>
                    </TableCell>
                    <TableCell>{project.clientName}</TableCell>
                    <TableCell>
                      <Badge className={getDivisionColor(project.division)}>
                        {project.division.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(project.contractAmount))}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(project.startDate), 'MMM d, yyyy')} -
                        {format(new Date(project.endDate), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.foreman ? (
                        <span>{project.foreman.firstName} {project.foreman.lastName}</span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {project._count?.phases || 0}
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
                          <DropdownMenuItem
                            onClick={() => router.push(`/projects/${project.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/projects/${project.id}/phases`)}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Manage Phases
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/projects/${project.id}/crew`)}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Manage Crew
                          </DropdownMenuItem>
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(project)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Project
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => router.push(`/projects/${project.id}/financials`)}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Financial Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/projects/${project.id}/reports`)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Generate Report
                          </DropdownMenuItem>
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(project.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Project
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}