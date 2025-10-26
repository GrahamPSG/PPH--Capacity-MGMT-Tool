'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addDays, startOfWeek } from 'date-fns';

interface ResourceData {
  employeeId: string;
  employeeName: string;
  employeeType: 'FOREMAN' | 'JOURNEYMAN' | 'APPRENTICE';
  division: string;
  weeklyAllocations: number[]; // Hours per week
}

export function ResourceHeatmap() {
  const [selectedDivision, setSelectedDivision] = React.useState('ALL');
  const [viewType, setViewType] = React.useState<'hours' | 'percentage'>('percentage');

  // Mock data - will be replaced with real API calls
  const resourceData: ResourceData[] = [
    {
      employeeId: '1',
      employeeName: 'John Smith',
      employeeType: 'FOREMAN',
      division: 'PLUMBING_MULTIFAMILY',
      weeklyAllocations: [40, 45, 38, 42, 40, 35, 40, 44],
    },
    {
      employeeId: '2',
      employeeName: 'Mike Johnson',
      employeeType: 'FOREMAN',
      division: 'HVAC_COMMERCIAL',
      weeklyAllocations: [38, 40, 42, 48, 45, 40, 38, 40],
    },
    {
      employeeId: '3',
      employeeName: 'Sarah Davis',
      employeeType: 'JOURNEYMAN',
      division: 'PLUMBING_MULTIFAMILY',
      weeklyAllocations: [40, 40, 35, 38, 40, 42, 45, 40],
    },
    {
      employeeId: '4',
      employeeName: 'Tom Wilson',
      employeeType: 'JOURNEYMAN',
      division: 'PLUMBING_MULTIFAMILY',
      weeklyAllocations: [35, 38, 40, 40, 42, 40, 38, 35],
    },
    {
      employeeId: '5',
      employeeName: 'Emily Brown',
      employeeType: 'APPRENTICE',
      division: 'HVAC_COMMERCIAL',
      weeklyAllocations: [30, 32, 35, 40, 38, 35, 30, 32],
    },
    {
      employeeId: '6',
      employeeName: 'Chris Martinez',
      employeeType: 'APPRENTICE',
      division: 'PLUMBING_MULTIFAMILY',
      weeklyAllocations: [32, 30, 28, 35, 40, 38, 35, 30],
    },
  ];

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekStart = addDays(startOfWeek(new Date()), i * 7);
    return format(weekStart, 'MMM d');
  });

  const getHeatmapColor = (hours: number, maxHours: number = 40) => {
    const percentage = (hours / maxHours) * 100;

    if (percentage === 0) return 'bg-gray-100';
    if (percentage <= 50) return 'bg-green-200';
    if (percentage <= 75) return 'bg-green-400';
    if (percentage <= 90) return 'bg-yellow-400';
    if (percentage <= 100) return 'bg-orange-400';
    return 'bg-red-500'; // Over 100%
  };

  const getTextColor = (hours: number, maxHours: number = 40) => {
    const percentage = (hours / maxHours) * 100;
    return percentage > 75 ? 'text-white' : 'text-gray-900';
  };

  const filteredData = selectedDivision === 'ALL'
    ? resourceData
    : resourceData.filter(r => r.division === selectedDivision);

  const sortedData = filteredData.sort((a, b) => {
    const typeOrder = { FOREMAN: 0, JOURNEYMAN: 1, APPRENTICE: 2 };
    if (a.employeeType !== b.employeeType) {
      return typeOrder[a.employeeType] - typeOrder[b.employeeType];
    }
    return a.employeeName.localeCompare(b.employeeName);
  });

  const getEmployeeTypeIcon = (type: string) => {
    const icons = {
      FOREMAN: '👷',
      JOURNEYMAN: '🔧',
      APPRENTICE: '📚',
    };
    return icons[type as keyof typeof icons] || '👤';
  };

  const calculateAverageUtilization = (allocations: number[]) => {
    const avg = allocations.reduce((sum, hours) => sum + hours, 0) / allocations.length;
    return ((avg / 40) * 100).toFixed(1);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Resource Allocation Heatmap</CardTitle>
          <div className="flex gap-2">
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Divisions</SelectItem>
                <SelectItem value="PLUMBING_MULTIFAMILY">Plumbing - Multifamily</SelectItem>
                <SelectItem value="PLUMBING_COMMERCIAL">Plumbing - Commercial</SelectItem>
                <SelectItem value="PLUMBING_CUSTOM">Plumbing - Custom</SelectItem>
                <SelectItem value="HVAC_MULTIFAMILY">HVAC - Multifamily</SelectItem>
                <SelectItem value="HVAC_COMMERCIAL">HVAC - Commercial</SelectItem>
                <SelectItem value="HVAC_CUSTOM">HVAC - Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={viewType} onValueChange={(v) => setViewType(v as 'hours' | 'percentage')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="flex mb-2">
              <div className="w-48 shrink-0 font-medium text-sm">Employee</div>
              <div className="w-20 text-center font-medium text-sm">Avg %</div>
              {weeks.map((week, index) => (
                <div key={index} className="flex-1 text-center text-xs font-medium text-muted-foreground min-w-[80px]">
                  {week}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {sortedData.map((resource) => (
              <div key={resource.employeeId} className="flex mb-1 items-center">
                <div className="w-48 shrink-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getEmployeeTypeIcon(resource.employeeType)}</span>
                    <div>
                      <div className="text-sm font-medium">{resource.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{resource.employeeType}</div>
                    </div>
                  </div>
                </div>
                <div className="w-20 text-center text-sm font-medium">
                  {calculateAverageUtilization(resource.weeklyAllocations)}%
                </div>
                {resource.weeklyAllocations.map((hours, index) => {
                  const displayValue = viewType === 'hours' ? hours : `${((hours / 40) * 100).toFixed(0)}%`;
                  return (
                    <div
                      key={index}
                      className={`flex-1 min-w-[80px] h-10 flex items-center justify-center text-xs font-medium rounded mx-0.5 ${getHeatmapColor(hours)} ${getTextColor(hours)}`}
                    >
                      {displayValue}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-sm font-medium mb-2">Utilization Legend</div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded" />
              <span className="text-xs">0%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-200 rounded" />
              <span className="text-xs">1-50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-400 rounded" />
              <span className="text-xs">51-75%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-400 rounded" />
              <span className="text-xs">76-90%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-400 rounded" />
              <span className="text-xs">91-100%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded" />
              <span className="text-xs">Over 100%</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <div className="text-xs text-muted-foreground">Total Resources</div>
            <div className="text-lg font-semibold">{sortedData.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Avg Weekly Hours</div>
            <div className="text-lg font-semibold">
              {(sortedData.reduce((sum, r) =>
                sum + r.weeklyAllocations.reduce((a, b) => a + b, 0) / r.weeklyAllocations.length, 0
              ) / sortedData.length).toFixed(1)}h
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Over-allocated</div>
            <div className="text-lg font-semibold text-red-600">
              {sortedData.filter(r =>
                r.weeklyAllocations.some(h => h > 40)
              ).length} people
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}