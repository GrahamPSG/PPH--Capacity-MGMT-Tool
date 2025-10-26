'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar
} from 'lucide-react';
import { MonthlyCapacity, CapacityData } from '@/services/capacity/CapacityCalculator';

interface CapacityUtilizationChartProps {
  data: MonthlyCapacity[];
  showDivisionBreakdown?: boolean;
}

export function CapacityUtilizationChart({
  data,
  showDivisionBreakdown = true
}: CapacityUtilizationChartProps) {
  const getUtilizationColor = (utilization: number) => {
    if (utilization < 60) return 'text-green-600 bg-green-100';
    if (utilization < 80) return 'text-yellow-600 bg-yellow-100';
    if (utilization < 95) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getUtilizationBarColor = (utilization: number) => {
    if (utilization < 60) return 'bg-green-500';
    if (utilization < 80) return 'bg-yellow-500';
    if (utilization < 95) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getUtilizationIcon = (utilization: number) => {
    if (utilization < 60) return <TrendingDown className="h-4 w-4" />;
    if (utilization < 80) return <CheckCircle className="h-4 w-4" />;
    if (utilization < 95) return <TrendingUp className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getUtilizationStatus = (utilization: number) => {
    if (utilization < 60) return 'Under-utilized';
    if (utilization < 80) return 'Optimal';
    if (utilization < 95) return 'Near Capacity';
    return 'Over Capacity';
  };

  const formatHours = (hours: number) => {
    if (hours < 1000) return `${hours}h`;
    return `${(hours / 1000).toFixed(1)}k hrs`;
  };

  const renderDivisionCard = (
    division: string,
    capacityData: CapacityData | null,
    color: string
  ) => {
    if (!capacityData) return null;

    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="font-medium text-sm">
              {division.replace(/_/g, ' ')}
            </span>
          </div>
          <Badge className={getUtilizationColor(capacityData.utilization)}>
            {capacityData.utilization}%
          </Badge>
        </div>

        <Progress
          value={capacityData.utilization}
          className="h-2 mb-3"
        />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Available:</span>
            <span className="ml-1 font-medium">{formatHours(capacityData.availableHours)}</span>
          </div>
          <div>
            <span className="text-gray-500">Required:</span>
            <span className="ml-1 font-medium">{formatHours(capacityData.requiredHours)}</span>
          </div>
          <div>
            <span className="text-gray-500">Crew:</span>
            <span className="ml-1 font-medium">{capacityData.employeeCount.total}</span>
          </div>
          <div>
            <span className="text-gray-500">Projects:</span>
            <span className="ml-1 font-medium">{capacityData.projectCount}</span>
          </div>
        </div>

        {capacityData.deficit > 0 && (
          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            Deficit: {formatHours(capacityData.deficit)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {data.map((monthData, index) => {
        const plumbingData = [
          monthData.plumbing.multifamily,
          monthData.plumbing.commercial,
          monthData.plumbing.custom
        ].filter(Boolean);

        const hvacData = [
          monthData.hvac.multifamily,
          monthData.hvac.commercial,
          monthData.hvac.custom
        ].filter(Boolean);

        return (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <CardTitle>
                    {monthData.month} {monthData.year}
                  </CardTitle>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-gray-500">Overall:</span>
                    <Badge
                      className={`ml-2 ${getUtilizationColor(monthData.totals.overallUtilization)}`}
                    >
                      {getUtilizationIcon(monthData.totals.overallUtilization)}
                      <span className="ml-1">{monthData.totals.overallUtilization}%</span>
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plumbing Division */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-blue-600 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                      Plumbing Division
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Utilization:</span>
                      <div className={`px-2 py-1 rounded text-sm font-medium ${
                        getUtilizationColor(monthData.totals.plumbingUtilization)
                      }`}>
                        {monthData.totals.plumbingUtilization}%
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Progress
                      value={monthData.totals.plumbingUtilization}
                      className={`h-6 ${getUtilizationBarColor(monthData.totals.plumbingUtilization)}`}
                    />
                    <div className="mt-1 text-xs text-gray-500 text-right">
                      {getUtilizationStatus(monthData.totals.plumbingUtilization)}
                    </div>
                  </div>

                  {showDivisionBreakdown && (
                    <div className="space-y-3">
                      {renderDivisionCard(
                        'PLUMBING_MULTIFAMILY',
                        monthData.plumbing.multifamily,
                        'bg-blue-400'
                      )}
                      {renderDivisionCard(
                        'PLUMBING_COMMERCIAL',
                        monthData.plumbing.commercial,
                        'bg-blue-500'
                      )}
                      {renderDivisionCard(
                        'PLUMBING_CUSTOM',
                        monthData.plumbing.custom,
                        'bg-blue-600'
                      )}
                    </div>
                  )}
                </div>

                {/* HVAC Division */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-orange-600 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-600" />
                      HVAC Division
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Utilization:</span>
                      <div className={`px-2 py-1 rounded text-sm font-medium ${
                        getUtilizationColor(monthData.totals.hvacUtilization)
                      }`}>
                        {monthData.totals.hvacUtilization}%
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Progress
                      value={monthData.totals.hvacUtilization}
                      className={`h-6 ${getUtilizationBarColor(monthData.totals.hvacUtilization)}`}
                    />
                    <div className="mt-1 text-xs text-gray-500 text-right">
                      {getUtilizationStatus(monthData.totals.hvacUtilization)}
                    </div>
                  </div>

                  {showDivisionBreakdown && (
                    <div className="space-y-3">
                      {renderDivisionCard(
                        'HVAC_MULTIFAMILY',
                        monthData.hvac.multifamily,
                        'bg-orange-400'
                      )}
                      {renderDivisionCard(
                        'HVAC_COMMERCIAL',
                        monthData.hvac.commercial,
                        'bg-orange-500'
                      )}
                      {renderDivisionCard(
                        'HVAC_CUSTOM',
                        monthData.hvac.custom,
                        'bg-orange-600'
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                {plumbingData.length > 0 && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {plumbingData.reduce((sum, d) => sum + (d?.employeeCount.total || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">Plumbing Crew</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {plumbingData.reduce((sum, d) => sum + (d?.projectCount || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">Plumbing Projects</div>
                    </div>
                  </>
                )}

                {hvacData.length > 0 && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {hvacData.reduce((sum, d) => sum + (d?.employeeCount.total || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">HVAC Crew</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {hvacData.reduce((sum, d) => sum + (d?.projectCount || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">HVAC Projects</div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}