'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, addMonths } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';

interface CashFlowData {
  month: string;
  revenue: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  invoiced: number;
  collected: number;
  projectedRevenue: number;
  projectedExpenses: number;
}

interface ProjectFinancial {
  projectName: string;
  contractAmount: number;
  billedToDate: number;
  collectedToDate: number;
  remainingToBill: number;
  expectedCompletion: Date;
  nextBillingDate: Date;
  nextBillingAmount: number;
}

export function CashFlowProjection() {
  const [timeRange, setTimeRange] = React.useState('6months');
  const [viewType, setViewType] = React.useState<'actual' | 'projected' | 'combined'>('combined');

  // Generate mock cash flow data
  const generateCashFlowData = (): CashFlowData[] => {
    const data: CashFlowData[] = [];
    let cumulativeCashFlow = 250000; // Starting cash position

    for (let i = -3; i < 9; i++) {
      const date = addMonths(startOfMonth(new Date()), i);
      const isPast = i < 0;
      const isCurrent = i === 0;

      const baseRevenue = 180000 + Math.random() * 40000;
      const baseExpenses = 150000 + Math.random() * 30000;

      const revenue = isPast ? baseRevenue : 0;
      const expenses = isPast ? baseExpenses : 0;
      const projectedRevenue = !isPast ? baseRevenue * (1 + i * 0.02) : 0;
      const projectedExpenses = !isPast ? baseExpenses * (1 + i * 0.01) : 0;

      const netCashFlow = (revenue || projectedRevenue) - (expenses || projectedExpenses);
      cumulativeCashFlow += netCashFlow;

      data.push({
        month: format(date, 'MMM yyyy'),
        revenue: Math.round(revenue),
        expenses: Math.round(expenses),
        netCashFlow: Math.round(netCashFlow),
        cumulativeCashFlow: Math.round(cumulativeCashFlow),
        invoiced: Math.round(revenue * 1.1),
        collected: Math.round(revenue * 0.85),
        projectedRevenue: Math.round(projectedRevenue),
        projectedExpenses: Math.round(projectedExpenses),
      });
    }

    return data;
  };

  const cashFlowData = generateCashFlowData();

  // Mock project financial data
  const projectFinancials: ProjectFinancial[] = [
    {
      projectName: 'Riverfront Towers - Building A',
      contractAmount: 850000,
      billedToDate: 425000,
      collectedToDate: 382500,
      remainingToBill: 425000,
      expectedCompletion: new Date('2025-03-15'),
      nextBillingDate: new Date('2025-02-01'),
      nextBillingAmount: 85000,
    },
    {
      projectName: 'Tech Campus HVAC Retrofit',
      contractAmount: 1200000,
      billedToDate: 240000,
      collectedToDate: 180000,
      remainingToBill: 960000,
      expectedCompletion: new Date('2025-04-30'),
      nextBillingDate: new Date('2025-02-15'),
      nextBillingAmount: 120000,
    },
    {
      projectName: 'Custom Home - Westside',
      contractAmount: 320000,
      billedToDate: 0,
      collectedToDate: 0,
      remainingToBill: 320000,
      expectedCompletion: new Date('2025-02-28'),
      nextBillingDate: new Date('2025-02-01'),
      nextBillingAmount: 64000,
    },
  ];

  const currentMonthData = cashFlowData.find(d => d.month === format(new Date(), 'MMM yyyy'));
  const totalContractValue = projectFinancials.reduce((sum, p) => sum + p.contractAmount, 0);
  const totalBilled = projectFinancials.reduce((sum, p) => sum + p.billedToDate, 0);
  const totalCollected = projectFinancials.reduce((sum, p) => sum + p.collectedToDate, 0);
  const totalRemaining = projectFinancials.reduce((sum, p) => sum + p.remainingToBill, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Cash Position</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(cashFlowData[3]?.cumulativeCashFlow || 0)}
            </div>
            <p className="text-xs text-muted-foreground">As of today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contract Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalContractValue)}</div>
            <p className="text-xs text-muted-foreground">Active projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding AR</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBilled - totalCollected)}</div>
            <p className="text-xs text-muted-foreground">To be collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining to Bill</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRemaining)}</div>
            <p className="text-xs text-muted-foreground">Future revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cash Flow Projection</CardTitle>
            <div className="flex gap-2">
              <Select value={viewType} onValueChange={(v) => setViewType(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actual">Actual Only</SelectItem>
                  <SelectItem value="projected">Projected Only</SelectItem>
                  <SelectItem value="combined">Combined View</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="12months">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis
                className="text-xs"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {(viewType === 'actual' || viewType === 'combined') && (
                <>
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" opacity={0.8} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" opacity={0.8} />
                </>
              )}

              {(viewType === 'projected' || viewType === 'combined') && (
                <>
                  <Bar dataKey="projectedRevenue" fill="#86efac" name="Projected Revenue" opacity={0.6} />
                  <Bar dataKey="projectedExpenses" fill="#fca5a5" name="Projected Expenses" opacity={0.6} />
                </>
              )}

              <Line
                type="monotone"
                dataKey="cumulativeCashFlow"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Cumulative Cash"
                dot={{ fill: '#3b82f6' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Project Schedule of Values */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule of Values - Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Project</th>
                  <th className="text-right py-2">Contract</th>
                  <th className="text-right py-2">Billed</th>
                  <th className="text-right py-2">Collected</th>
                  <th className="text-right py-2">Next Billing</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-center py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {projectFinancials.map((project, index) => {
                  const collectionRate = (project.collectedToDate / project.billedToDate) * 100 || 0;
                  const completionRate = (project.billedToDate / project.contractAmount) * 100;

                  return (
                    <tr key={index} className="border-b">
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{project.projectName}</div>
                          <div className="text-xs text-muted-foreground">
                            Complete by {format(project.expectedCompletion, 'MMM d, yyyy')}
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 font-medium">
                        {formatCurrency(project.contractAmount)}
                      </td>
                      <td className="text-right py-3">
                        <div>
                          <div>{formatCurrency(project.billedToDate)}</div>
                          <div className="text-xs text-muted-foreground">
                            {completionRate.toFixed(0)}% complete
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3">
                        <div>
                          <div>{formatCurrency(project.collectedToDate)}</div>
                          <div className="text-xs text-muted-foreground">
                            {collectionRate.toFixed(0)}% collected
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3">
                        {format(project.nextBillingDate, 'MMM d')}
                      </td>
                      <td className="text-right py-3 font-medium">
                        {formatCurrency(project.nextBillingAmount)}
                      </td>
                      <td className="text-center py-3">
                        <Badge
                          variant={collectionRate >= 90 ? 'secondary' : collectionRate >= 75 ? 'outline' : 'destructive'}
                        >
                          {collectionRate >= 90 ? 'Healthy' : collectionRate >= 75 ? 'Monitor' : 'At Risk'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="py-3">Total</td>
                  <td className="text-right py-3">{formatCurrency(totalContractValue)}</td>
                  <td className="text-right py-3">{formatCurrency(totalBilled)}</td>
                  <td className="text-right py-3">{formatCurrency(totalCollected)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}