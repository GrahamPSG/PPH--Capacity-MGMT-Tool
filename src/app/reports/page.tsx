'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Send,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'financial' | 'operational' | 'capacity' | 'project' | 'employee';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on-demand';
  lastGenerated?: Date;
  icon: React.ReactNode;
  color: string;
}

const availableReports: Report[] = [
  {
    id: '1',
    name: 'Financial Summary',
    description: 'Revenue, expenses, profit margins, and cash flow analysis',
    type: 'financial',
    frequency: 'monthly',
    lastGenerated: new Date('2024-10-01'),
    icon: <DollarSign className="h-5 w-5" />,
    color: 'bg-green-100 text-green-700'
  },
  {
    id: '2',
    name: 'Capacity Utilization',
    description: 'Employee utilization rates and resource allocation',
    type: 'capacity',
    frequency: 'weekly',
    lastGenerated: new Date('2024-10-20'),
    icon: <Users className="h-5 w-5" />,
    color: 'bg-blue-100 text-blue-700'
  },
  {
    id: '3',
    name: 'Project Status Report',
    description: 'Active projects progress, timelines, and risks',
    type: 'project',
    frequency: 'weekly',
    lastGenerated: new Date('2024-10-21'),
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'bg-purple-100 text-purple-700'
  },
  {
    id: '4',
    name: 'Labor Forecast',
    description: '13-week rolling forecast of labor demand and supply',
    type: 'operational',
    frequency: 'weekly',
    lastGenerated: new Date('2024-10-20'),
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'bg-yellow-100 text-yellow-700'
  },
  {
    id: '5',
    name: 'Schedule Conflicts',
    description: 'Double bookings and capacity overruns analysis',
    type: 'operational',
    frequency: 'daily',
    lastGenerated: new Date(),
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-red-100 text-red-700'
  },
  {
    id: '6',
    name: 'Employee Performance',
    description: 'Individual and team performance metrics',
    type: 'employee',
    frequency: 'monthly',
    lastGenerated: new Date('2024-10-01'),
    icon: <Users className="h-5 w-5" />,
    color: 'bg-indigo-100 text-indigo-700'
  },
  {
    id: '7',
    name: 'Division Analysis',
    description: 'Performance comparison across HVAC, Plumbing, and Electrical',
    type: 'operational',
    frequency: 'monthly',
    lastGenerated: new Date('2024-10-01'),
    icon: <PieChart className="h-5 w-5" />,
    color: 'bg-orange-100 text-orange-700'
  },
  {
    id: '8',
    name: 'Cash Flow Projection',
    description: 'Future cash flow based on projects and billing schedules',
    type: 'financial',
    frequency: 'monthly',
    lastGenerated: new Date('2024-10-01'),
    icon: <DollarSign className="h-5 w-5" />,
    color: 'bg-green-100 text-green-700'
  }
];

export default function ReportsPage() {
  const [selectedReportType, setSelectedReportType] = useState('all');
  const [selectedFrequency, setSelectedFrequency] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });

  const filteredReports = availableReports.filter(report => {
    if (selectedReportType !== 'all' && report.type !== selectedReportType) return false;
    if (selectedFrequency !== 'all' && report.frequency !== selectedFrequency) return false;
    return true;
  });

  const handleGenerateReport = (reportId: string) => {
    console.log('Generating report:', reportId);
    // Implement report generation
  };

  const handleScheduleReport = (reportId: string) => {
    console.log('Scheduling report:', reportId);
    // Implement report scheduling
  };

  const handleExportReport = (reportId: string, format: 'pdf' | 'excel' | 'csv') => {
    console.log('Exporting report:', reportId, 'as', format);
    // Implement export functionality
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate and schedule business reports</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Report Settings
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Reports</p>
                <p className="text-2xl font-bold text-gray-900">{availableReports.length}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {availableReports.filter(r => r.frequency !== 'on-demand').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Generated Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {availableReports.filter(r =>
                    r.lastGenerated && format(r.lastGenerated, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  ).length}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={selectedReportType} onValueChange={setSelectedReportType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="capacity">Capacity</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="on-demand">On Demand</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map(report => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${report.color}`}>
                  {report.icon}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleGenerateReport(report.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-3">{report.name}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type</span>
                  <span className="font-medium text-gray-900 capitalize">{report.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frequency</span>
                  <span className="font-medium text-gray-900 capitalize">{report.frequency}</span>
                </div>
                {report.lastGenerated && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Generated</span>
                    <span className="font-medium text-gray-900">
                      {format(report.lastGenerated, 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                <div className="pt-3 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleGenerateReport(report.id)}>
                    Generate
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Send className="h-3 w-3 mr-1" />
                    Schedule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Previously generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2 font-medium text-gray-900">Report</th>
                <th className="text-left p-2 font-medium text-gray-900">Type</th>
                <th className="text-left p-2 font-medium text-gray-900">Generated</th>
                <th className="text-left p-2 font-medium text-gray-900">Size</th>
                <th className="text-left p-2 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 text-gray-900">October Financial Summary</td>
                <td className="p-2 text-gray-600">Financial</td>
                <td className="p-2 text-gray-600">Oct 23, 2024 09:30 AM</td>
                <td className="p-2 text-gray-600">2.4 MB</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-2 text-gray-900">Weekly Capacity Report</td>
                <td className="p-2 text-gray-600">Capacity</td>
                <td className="p-2 text-gray-600">Oct 22, 2024 06:00 AM</td>
                <td className="p-2 text-gray-600">856 KB</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}