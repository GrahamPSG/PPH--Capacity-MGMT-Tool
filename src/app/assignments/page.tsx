'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays,
  Clock,
  User,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns';

interface Assignment {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  phaseId: string;
  phaseName: string;
  date: Date;
  hoursAllocated: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  division: string;
  conflicts?: string[];
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, [currentWeek]);

  const fetchAssignments = async () => {
    try {
      const start = startOfWeek(currentWeek);
      const end = endOfWeek(currentWeek);
      const response = await fetch(`/api/assignments?start=${start.toISOString()}&end=${end.toISOString()}`);
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      // Mock data
      const mockAssignments: Assignment[] = [
        {
          id: '1',
          employeeId: '1',
          employeeName: 'John Smith',
          projectId: '1',
          projectName: 'City Center HVAC',
          phaseId: '1',
          phaseName: 'Installation',
          date: new Date(),
          hoursAllocated: 8,
          status: 'scheduled',
          division: 'HVAC'
        },
        {
          id: '2',
          employeeId: '2',
          employeeName: 'Sarah Johnson',
          projectId: '2',
          projectName: 'Hospital Plumbing',
          phaseId: '2',
          phaseName: 'Rough-In',
          date: new Date(),
          hoursAllocated: 6,
          status: 'in-progress',
          division: 'Plumbing',
          conflicts: ['Double-booked']
        },
        {
          id: '3',
          employeeId: '3',
          employeeName: 'Mike Davis',
          projectId: '3',
          projectName: 'School Electrical',
          phaseId: '3',
          phaseName: 'Wiring',
          date: addWeeks(new Date(), 1),
          hoursAllocated: 8,
          status: 'scheduled',
          division: 'Electrical'
        }
      ];
      setAssignments(mockAssignments);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek),
    end: endOfWeek(currentWeek)
  });

  const getAssignmentsForDay = (date: Date) => {
    return assignments.filter(a => isSameDay(new Date(a.date), date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (searchTerm && !a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !a.projectName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (divisionFilter !== 'all' && a.division !== divisionFilter) {
      return false;
    }
    if (statusFilter !== 'all' && a.status !== statusFilter) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Crew Assignments</h1>
          <p className="text-gray-600">Schedule and manage workforce assignments</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assignments.filter(a => a.status === 'in-progress').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assignments.filter(a => a.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conflicts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assignments.filter(a => a.conflicts && a.conflicts.length > 0).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                <SelectItem value="HVAC">HVAC</SelectItem>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold text-gray-900">
              Week of {format(startOfWeek(currentWeek), 'MMM d, yyyy')}
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day, index) => {
              const dayAssignments = getAssignmentsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <Card key={index} className={isToday ? 'ring-2 ring-blue-500' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {format(day, 'EEE')}
                      <br />
                      <span className="text-lg">{format(day, 'd')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dayAssignments.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">No assignments</p>
                    ) : (
                      dayAssignments.map(assignment => (
                        <div
                          key={assignment.id}
                          className="p-2 bg-gray-50 rounded-lg text-xs space-y-1"
                        >
                          <div className="font-semibold text-gray-900">{assignment.employeeName}</div>
                          <div className="text-gray-600">{assignment.projectName}</div>
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusColor(assignment.status)}>
                              {assignment.hoursAllocated}h
                            </Badge>
                            {assignment.conflicts && assignment.conflicts.length > 0 && (
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-900">Employee</th>
                    <th className="text-left p-4 font-medium text-gray-900">Project</th>
                    <th className="text-left p-4 font-medium text-gray-900">Phase</th>
                    <th className="text-left p-4 font-medium text-gray-900">Date</th>
                    <th className="text-left p-4 font-medium text-gray-900">Hours</th>
                    <th className="text-left p-4 font-medium text-gray-900">Status</th>
                    <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(assignment => (
                    <tr key={assignment.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{assignment.employeeName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-900">{assignment.projectName}</td>
                      <td className="p-4 text-gray-900">{assignment.phaseName}</td>
                      <td className="p-4 text-gray-900">{format(new Date(assignment.date), 'MMM d, yyyy')}</td>
                      <td className="p-4">
                        <Badge variant="outline">{assignment.hoursAllocated}h</Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm">Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}