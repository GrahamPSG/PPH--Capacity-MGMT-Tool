'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Users, Clock, TrendingUp } from 'lucide-react';

interface CapacityMetric {
  division: string;
  totalEmployees: number;
  availableHours: number;
  scheduledHours: number;
  utilizationPercentage: number;
  foremanCount: number;
  journeymanCount: number;
  apprenticeCount: number;
  projectCount: number;
}

export function CapacityOverview() {
  // Mock data - will be replaced with real API calls
  const capacityData: CapacityMetric[] = [
    {
      division: 'PLUMBING_MULTIFAMILY',
      totalEmployees: 15,
      availableHours: 600,
      scheduledHours: 480,
      utilizationPercentage: 80,
      foremanCount: 3,
      journeymanCount: 8,
      apprenticeCount: 4,
      projectCount: 5,
    },
    {
      division: 'HVAC_COMMERCIAL',
      totalEmployees: 12,
      availableHours: 480,
      scheduledHours: 420,
      utilizationPercentage: 87.5,
      foremanCount: 2,
      journeymanCount: 6,
      apprenticeCount: 4,
      projectCount: 3,
    },
  ];

  const getDivisionName = (division: string) => {
    const names: Record<string, string> = {
      PLUMBING_MULTIFAMILY: 'Plumbing - Multifamily',
      PLUMBING_COMMERCIAL: 'Plumbing - Commercial',
      PLUMBING_CUSTOM: 'Plumbing - Custom',
      HVAC_MULTIFAMILY: 'HVAC - Multifamily',
      HVAC_COMMERCIAL: 'HVAC - Commercial',
      HVAC_CUSTOM: 'HVAC - Custom',
    };
    return names[division] || division;
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getTotalMetrics = () => {
    return capacityData.reduce(
      (acc, curr) => ({
        totalEmployees: acc.totalEmployees + curr.totalEmployees,
        availableHours: acc.availableHours + curr.availableHours,
        scheduledHours: acc.scheduledHours + curr.scheduledHours,
        projectCount: acc.projectCount + curr.projectCount,
      }),
      { totalEmployees: 0, availableHours: 0, scheduledHours: 0, projectCount: 0 }
    );
  };

  const totals = getTotalMetrics();
  const overallUtilization = (totals.scheduledHours / totals.availableHours) * 100;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workforce</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.availableHours.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallUtilization.toFixed(1)}%</div>
            <Progress value={overallUtilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.projectCount}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Division Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {capacityData.map((division) => (
          <Card key={division.division} className="overflow-hidden">
            <CardHeader>
              <CardTitle>{getDivisionName(division.division)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Utilization</span>
                  <span className="font-semibold">{division.utilizationPercentage}%</span>
                </div>
                <Progress value={division.utilizationPercentage} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="text-xl font-semibold">{division.scheduledHours}h</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-xl font-semibold">{division.availableHours}h</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Crew Breakdown</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Foremen:</span>
                    <span className="font-medium">{division.foremanCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Journeymen:</span>
                    <span className="font-medium">{division.journeymanCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Apprentices:</span>
                    <span className="font-medium">{division.apprenticeCount}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">Active Projects</span>
                <span className="text-sm font-semibold">{division.projectCount}</span>
              </div>

              {division.utilizationPercentage >= 90 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">High utilization - capacity warning</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}