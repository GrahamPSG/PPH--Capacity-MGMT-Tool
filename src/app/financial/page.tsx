'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashFlowProjection } from '@/components/financial/CashFlowProjection';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  FileText,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';

export default function FinancialDashboard() {
  const [lastSync, setLastSync] = React.useState(new Date());
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLastSync(new Date());
    setIsRefreshing(false);
  };

  const handleExport = () => {
    console.log('Exporting financial report...');
  };

  const handleImportSOV = () => {
    console.log('Importing Schedule of Values...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Financial Management Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Cash flow projections, billing schedules, and financial analytics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Last sync: {lastSync.toLocaleTimeString()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportSOV}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import SOV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="cashflow" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="cashflow" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cash Flow
            </TabsTrigger>
            <TabsTrigger value="projections" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Projections
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cashflow" className="space-y-6">
            <CashFlowProjection />
          </TabsContent>

          <TabsContent value="projections" className="space-y-6">
            <div className="grid gap-6">
              <div className="rounded-lg border bg-white p-6">
                <h2 className="text-lg font-semibold mb-4">Revenue Projections</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Q1 2025</p>
                      <p className="text-xl font-semibold">$2.1M</p>
                      <p className="text-xs text-green-600">+12% vs Q4 2024</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Q2 2025</p>
                      <p className="text-xl font-semibold">$2.4M</p>
                      <p className="text-xs text-green-600">+14% projected</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Full Year 2025</p>
                      <p className="text-xl font-semibold">$9.8M</p>
                      <p className="text-xs text-green-600">+18% YoY</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-6">
                <h2 className="text-lg font-semibold mb-4">Cost Analysis</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Labor Costs</span>
                    <span className="font-medium">65% of revenue</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Materials</span>
                    <span className="font-medium">18% of revenue</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Equipment</span>
                    <span className="font-medium">7% of revenue</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overhead</span>
                    <span className="font-medium">10% of revenue</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid gap-6">
              <div className="rounded-lg border bg-white p-6">
                <h2 className="text-lg font-semibold mb-4">Financial Reports</h2>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 rounded hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Monthly P&L Statement</p>
                      <p className="text-sm text-gray-500">January 2025</p>
                    </div>
                    <FileText className="h-5 w-5 text-gray-400" />
                  </button>
                  <button className="w-full text-left p-3 rounded hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Quarterly Cash Flow Analysis</p>
                      <p className="text-sm text-gray-500">Q4 2024</p>
                    </div>
                    <FileText className="h-5 w-5 text-gray-400" />
                  </button>
                  <button className="w-full text-left p-3 rounded hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Annual Budget vs Actual</p>
                      <p className="text-sm text-gray-500">2024 Year-End</p>
                    </div>
                    <FileText className="h-5 w-5 text-gray-400" />
                  </button>
                  <button className="w-full text-left p-3 rounded hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Project Profitability Report</p>
                      <p className="text-sm text-gray-500">All Active Projects</p>
                    </div>
                    <FileText className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}