'use client';

import { useState, useEffect } from 'react';

interface CapacityData {
  month: string;
  plumbingDemand: number;
  hvacDemand: number;
  plumbingCapacity: number;
  hvacCapacity: number;
  plumbingUtilization: number;
  hvacUtilization: number;
}

export default function CapacityPage() {
  const [capacityData, setCapacityData] = useState<CapacityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonths, setViewMonths] = useState(3);

  useEffect(() => {
    fetchCapacityData();
  }, [viewMonths]);

  const fetchCapacityData = async () => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + viewMonths);

      const response = await fetch(
        `/api/simple/capacity?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();
      setCapacityData(data.capacity || []);
    } catch (error) {
      console.error('Failed to fetch capacity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 60) return 'bg-green-500';
    if (utilization < 80) return 'bg-yellow-500';
    if (utilization < 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Capacity Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMonths(3)}
              className={`px-4 py-2 rounded ${viewMonths === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              3 Months
            </button>
            <button
              onClick={() => setViewMonths(6)}
              className={`px-4 py-2 rounded ${viewMonths === 6 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              6 Months
            </button>
            <button
              onClick={() => setViewMonths(12)}
              className={`px-4 py-2 rounded ${viewMonths === 12 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              12 Months
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading capacity data...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plumbing Capacity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600">Plumbing Division</h2>
              <div className="space-y-4">
                {capacityData.map((month) => (
                  <div key={month.month}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{month.month}</span>
                      <span>{Math.round(month.plumbingUtilization)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className={`h-6 rounded-full ${getUtilizationColor(month.plumbingUtilization)}`}
                        style={{ width: `${Math.min(100, month.plumbingUtilization)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {month.plumbingDemand} workers needed / {Math.floor(month.plumbingCapacity / 160)} available
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HVAC Capacity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-green-600">HVAC Division</h2>
              <div className="space-y-4">
                {capacityData.map((month) => (
                  <div key={month.month}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{month.month}</span>
                      <span>{Math.round(month.hvacUtilization)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className={`h-6 rounded-full ${getUtilizationColor(month.hvacUtilization)}`}
                        style={{ width: `${Math.min(100, month.hvacUtilization)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {month.hvacDemand} workers needed / {Math.floor(month.hvacCapacity / 160)} available
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-sm font-semibold mb-2">Utilization Legend:</h3>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>&lt; 60% (Good capacity)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded" />
              <span>60-80% (Moderate)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded" />
              <span>80-100% (Near capacity)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span>&gt; 100% (Over capacity)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
