'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Search,
  Download,
  Upload,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  Award,
  AlertTriangle,
  Edit,
  Eye
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  currentDivision: string;
  qualifications: string[];
  isActive: boolean;
  hourlyRate: number;
  utilizationRate: number;
  currentAssignments: number;
  availableHours: number;
  certifications: string[];
  experience: number;
  avatar?: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, divisionFilter, statusFilter, roleFilter]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Use mock data for now
      const mockEmployees: Employee[] = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john.smith@pph.com',
          role: 'Foreman',
          currentDivision: 'HVAC',
          qualifications: ['HVAC Tech', 'Refrigeration'],
          isActive: true,
          hourlyRate: 85,
          utilizationRate: 92,
          currentAssignments: 3,
          availableHours: 8,
          certifications: ['EPA Universal', 'NATE Certified'],
          experience: 15
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@pph.com',
          role: 'Technician',
          currentDivision: 'Plumbing',
          qualifications: ['Master Plumber', 'Gas Fitting'],
          isActive: true,
          hourlyRate: 75,
          utilizationRate: 85,
          currentAssignments: 2,
          availableHours: 16,
          certifications: ['Master Plumber License', 'Backflow Prevention'],
          experience: 12
        },
        {
          id: '3',
          name: 'Mike Davis',
          email: 'mike.davis@pph.com',
          role: 'Electrician',
          currentDivision: 'Electrical',
          qualifications: ['Master Electrician', 'Industrial'],
          isActive: true,
          hourlyRate: 80,
          utilizationRate: 78,
          currentAssignments: 2,
          availableHours: 24,
          certifications: ['Master Electrician', 'OSHA 30'],
          experience: 10
        },
        {
          id: '4',
          name: 'Emily Wilson',
          email: 'emily.wilson@pph.com',
          role: 'Apprentice',
          currentDivision: 'HVAC',
          qualifications: ['HVAC Basics'],
          isActive: true,
          hourlyRate: 45,
          utilizationRate: 95,
          currentAssignments: 1,
          availableHours: 4,
          certifications: ['OSHA 10'],
          experience: 2
        },
        {
          id: '5',
          name: 'Robert Brown',
          email: 'robert.brown@pph.com',
          role: 'Technician',
          currentDivision: 'Plumbing',
          qualifications: ['Journeyman Plumber'],
          isActive: false,
          hourlyRate: 65,
          utilizationRate: 0,
          currentAssignments: 0,
          availableHours: 40,
          certifications: ['Journeyman License'],
          experience: 5
        }
      ];
      setEmployees(mockEmployees);
      setFilteredEmployees(mockEmployees);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (divisionFilter !== 'all') {
      filtered = filtered.filter(e => e.currentDivision === divisionFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.isActive === (statusFilter === 'active'));
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(e => e.role === roleFilter);
    }

    setFilteredEmployees(filtered);
  };

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.isActive).length,
    avgUtilization: Math.round(
      employees.filter(e => e.isActive).reduce((sum, e) => sum + e.utilizationRate, 0) /
      Math.max(employees.filter(e => e.isActive).length, 1)
    ),
    availableHours: employees.filter(e => e.isActive).reduce((sum, e) => sum + e.availableHours, 0)
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600">Manage workforce and assignments</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgUtilization}%</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Hours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.availableHours}h</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
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
                  placeholder="Search employees..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Foreman">Foreman</SelectItem>
                <SelectItem value="Technician">Technician</SelectItem>
                <SelectItem value="Electrician">Electrician</SelectItem>
                <SelectItem value="Apprentice">Apprentice</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map(employee => (
          <Card key={employee.id} className={!employee.isActive ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={employee.avatar} />
                    <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                    <p className="text-sm text-gray-600">{employee.email}</p>
                  </div>
                </div>
                <Badge className={employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Role</p>
                  <p className="font-medium text-gray-900">{employee.role}</p>
                </div>
                <div>
                  <p className="text-gray-600">Division</p>
                  <p className="font-medium text-gray-900">{employee.currentDivision}</p>
                </div>
                <div>
                  <p className="text-gray-600">Experience</p>
                  <p className="font-medium text-gray-900">{employee.experience} years</p>
                </div>
                <div>
                  <p className="text-gray-600">Rate</p>
                  <p className="font-medium text-gray-900">${employee.hourlyRate}/hr</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Utilization</span>
                  <span className={`font-medium ${getUtilizationColor(employee.utilizationRate)}`}>
                    {employee.utilizationRate}%
                  </span>
                </div>
                <Progress value={employee.utilizationRate} className="h-2" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{employee.availableHours}h available</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{employee.certifications.length} certs</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button size="sm" className="flex-1">
                  Assign
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No employees found matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}