'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Division } from '@prisma/client';
import { GanttChart } from '@/components/capacity/GanttChart';
import { CapacityUtilizationChart } from '@/components/capacity/CapacityUtilizationChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';
import { startOfMonth, addMonths } from 'date-fns';

type ViewMode = 'gantt' | 'utilization' | 'both';
type TimeRange = '3months' | '6months' | '12months' | '24months';

export default function CapacityDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [timeRange, setTimeRange] = useState<TimeRange>('6months');
  const [selectedDivision, setSelectedDivision] = useState<Division | 'ALL'>('ALL');

  // Calculate date range based on selected time range
  const startDate = startOfMonth(new Date());
  const monthsAhead = parseInt(timeRange);
  const endDate = addMonths(startDate, monthsAhead);

  // Fetch capacity data
  const { data: capacityData, isLoading: capacityLoading, error: capacityError, refetch: refetchCapacity } = useQuery({
    queryKey: ['capacity', timeRange, selectedDivision],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(selectedDivision !== 'ALL' && { division: selectedDivision })
      });

      const response = await fetch(`/api/capacity?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch capacity data');
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });

  // Fetch phases for Gantt chart
  const { data: phasesData, isLoading: phasesLoading, error: phasesError } = useQuery({
    queryKey: ['phases-gantt', timeRange, selectedDivision],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(selectedDivision !== 'ALL' && { division: selectedDivision })
      });

      const response = await fetch(`/api/phases?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch phases');
      return response.json();
    },
    staleTime: 60000,
  });

  // Fetch critical periods (over 90% utilization)
  const { data: criticalPeriods } = useQuery({
    queryKey: ['critical-periods', timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        threshold: '90'
      });

      const response = await fetch(`/api/capacity/critical?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch critical periods');
      return response.json();
    },
    staleTime: 60000,
  });

  const isLoading = capacityLoading || phasesLoading;
  const error = capacityError || phasesError;

  const handleExportData = () => {
    // Export capacity data as CSV
    if (!capacityData) return;

    const csv = capacityData.map((month: any) => {
      return [
        month.month,
        month.year,
        month.totals.plumbingUtilization,
        month.totals.hvacUtilization,
        month.totals.overallUtilization
      ].join(',');
    }).join('\n');

    const headers = 'Month,Year,Plumbing %,HVAC %,Overall %\n';
    const blob = new Blob([headers + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capacity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Capacity Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and forecast labor capacity across divisions
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => refetchCapacity()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportData} disabled={!capacityData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & View Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">View Mode</label>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Timeline & Utilization</SelectItem>
                  <SelectItem value="gantt">Timeline Only</SelectItem>
                  <SelectItem value="utilization">Utilization Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Time Range</label>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="12months">12 Months</SelectItem>
                  <SelectItem value="24months">24 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Division</label>
              <Select value={selectedDivision} onValueChange={(v) => setSelectedDivision(v as Division | 'ALL')}>
                <SelectTrigger>
                  <SelectValue />
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

            <div className="flex items-end">
              {criticalPeriods && criticalPeriods.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    {criticalPeriods.length} critical period{criticalPeriods.length > 1 ? 's' : ''} detected
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load capacity data'}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading capacity data...</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'both' && (
            <Tabs defaultValue="timeline" className="space-y-6">
              <TabsList>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Project Timeline
                </TabsTrigger>
                <TabsTrigger value="utilization" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Capacity Utilization
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-6">
                {phasesData && (
                  <GanttChart
                    phases={phasesData}
                    startDate={startDate}
                    endDate={endDate}
                    division={selectedDivision !== 'ALL' ? selectedDivision : undefined}
                    onPhaseClick={(phase) => {
                      // Navigate to phase details
                      console.log('Phase clicked:', phase);
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="utilization" className="space-y-6">
                {capacityData && (
                  <CapacityUtilizationChart
                    data={capacityData}
                    showDivisionBreakdown={selectedDivision === 'ALL'}
                  />
                )}
              </TabsContent>
            </Tabs>
          )}

          {viewMode === 'gantt' && phasesData && (
            <GanttChart
              phases={phasesData}
              startDate={startDate}
              endDate={endDate}
              division={selectedDivision !== 'ALL' ? selectedDivision : undefined}
              onPhaseClick={(phase) => {
                console.log('Phase clicked:', phase);
              }}
            />
          )}

          {viewMode === 'utilization' && capacityData && (
            <CapacityUtilizationChart
              data={capacityData}
              showDivisionBreakdown={selectedDivision === 'ALL'}
            />
          )}
        </>
      )}

      {/* Summary Cards */}
      {capacityData && capacityData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Average Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(
                  capacityData.reduce((sum: number, m: any) => sum + m.totals.overallUtilization, 0) /
                  capacityData.length
                )}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Across all divisions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Peak Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.max(...capacityData.map((m: any) => m.totals.overallUtilization))}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Highest monthly utilization
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Critical Periods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {criticalPeriods?.length || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Months over 90% capacity
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}