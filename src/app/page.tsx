import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Calendar,
  Users,
  BarChart3,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard | PPH Capacity Management',
  description: 'Paris Plumbing and Heating capacity management dashboard',
};

export default function DashboardPage() {
  // Mock data - would come from API in real implementation
  const stats = {
    activeProjects: 24,
    totalEmployees: 47,
    capacityUtilization: 78,
    upcomingPhases: 15,
    criticalPeriods: 3
  };

  const quickActions = [
    {
      title: 'View Capacity',
      description: 'Check current and forecasted capacity utilization',
      href: '/capacity',
      icon: BarChart3,
      color: 'bg-blue-500'
    },
    {
      title: 'Manage Projects',
      description: 'Add or update project information',
      href: '/projects',
      icon: Briefcase,
      color: 'bg-green-500'
    },
    {
      title: 'Import Data',
      description: 'Bulk import projects, phases, or employees',
      href: '/import',
      icon: Upload,
      color: 'bg-purple-500'
    },
    {
      title: 'View Reports',
      description: 'Generate capacity and utilization reports',
      href: '/reports',
      icon: FileSpreadsheet,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Capacity Management Dashboard
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Paris Plumbing and Heating - Resource Planning & Forecasting
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-600 mr-1" />
              +3 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Across both divisions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity Used</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.capacityUtilization}%</div>
            <p className="text-xs text-muted-foreground">
              Current month average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Phases</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingPhases}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Periods</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.criticalPeriods}</div>
            <p className="text-xs text-muted-foreground">
              Over 90% capacity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card key={action.href} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href={action.href}>
                      Go to {action.title.split(' ')[0]}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Division Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plumbing Division</CardTitle>
            <CardDescription>Current status and utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Multifamily</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">65%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Commercial</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">82%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Custom</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">45%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HVAC Division</CardTitle>
            <CardDescription>Current status and utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Multifamily</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">78%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Commercial</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '91%' }}></div>
                  </div>
                  <span className="text-sm text-orange-600">91%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Custom</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '58%' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">58%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates to projects and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium">Downtown Office Complex - Phase Complete</p>
                <p className="text-xs text-gray-500">Underground rough-in completed • 2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-orange-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium">Mountain View Apartments - Crew Shortage</p>
                <p className="text-xs text-gray-500">Need 2 more journeymen for HVAC • 5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium">New Project Added</p>
                <p className="text-xs text-gray-500">Riverside Medical Center • Yesterday</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}