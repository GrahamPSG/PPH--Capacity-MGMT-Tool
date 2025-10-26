'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  Clock,
  BarChart3,
  Activity
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

interface MetricValue {
  value: number;
  trend: number;
  status: 'good' | 'warning' | 'critical';
  unit?: string;
}

interface PerformanceMetrics {
  overallUtilization: MetricValue;
  divisionUtilization: Record<string, MetricValue>;
  employeeUtilization: MetricValue;
  activeProjects: MetricValue;
  projectsOnSchedule: MetricValue;
  projectCompletionRate: MetricValue;
  averageProjectDuration: MetricValue;
  totalRevenue: MetricValue;
  revenuePerEmployee: MetricValue;
  profitMargin: MetricValue;
  cashFlowStatus: MetricValue;
  outstandingInvoices: MetricValue;
  totalCapacityHours: MetricValue;
  utilizedHours: MetricValue;
  availableHours: MetricValue;
  overtimeHours: MetricValue;
  scheduleAdherence: MetricValue;
  reworkRate: MetricValue;
  clientSatisfaction: MetricValue;
  plannedVsActualHours: MetricValue;
  resourceAllocationEfficiency: MetricValue;
  crossDivisionCollaboration: MetricValue;
  atRiskProjects: MetricValue;
  capacityRiskScore: MetricValue;
  scheduleConflicts: MetricValue;
}

const COLORS = {
  good: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  tertiary: '#ec4899'
};

const MetricCard: React.FC<{
  title: string;
  metric: MetricValue;
  icon: React.ReactNode;
  size?: 'small' | 'large';
}> = ({ title, metric, icon, size = 'small' }) => {
  const getTrendIcon = () => {
    if (metric.trend > 0) return <TrendingUp className="h-4 w-4" />;
    if (metric.trend < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    switch (metric.status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatValue = () => {
    if (metric.unit === '$') {
      return `$${metric.value.toLocaleString()}`;
    }
    if (metric.unit === '%') {
      return `${metric.value}%`;
    }
    if (metric.unit) {
      return `${metric.value} ${metric.unit}`;
    }
    return metric.value.toString();
  };

  if (size === 'large') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              {icon}
              {title}
            </span>
            <Badge variant={metric.status === 'good' ? 'default' : metric.status === 'warning' ? 'secondary' : 'destructive'}>
              {metric.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatValue()}</div>
          <div className={`flex items-center gap-1 mt-2 ${getStatusColor()}`}>
            {getTrendIcon()}
            <span className="text-sm">
              {metric.trend > 0 ? '+' : ''}{metric.trend}% from last period
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <p className="text-sm text-gray-600">{title}</p>
              <p className="text-2xl font-semibold">{formatValue()}</p>
            </div>
          </div>
          <div className={`flex flex-col items-end ${getStatusColor()}`}>
            {getTrendIcon()}
            <span className="text-xs">{metric.trend > 0 ? '+' : ''}{metric.trend}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [division, setDivision] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchHistoricalData();
  }, [period, division]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      let start: Date, end: Date;
      const now = new Date();

      switch (period) {
        case 'daily':
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          start = startOfWeek(now);
          end = endOfWeek(now);
          break;
        case 'monthly':
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case 'quarterly':
          start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          end = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
          break;
      }

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        ...(division !== 'all' && { division })
      });

      const response = await fetch(`/api/metrics?${params}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch(`/api/metrics/historical?metric=overallUtilization&periods=12&periodType=${period}`);
      const data = await response.json();
      setHistoricalData(data);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    await fetchHistoricalData();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/metrics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          division: division !== 'all' ? division : undefined
        })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting metrics:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No metrics data available</p>
      </div>
    );
  }

  // Prepare data for charts
  const divisionData = Object.entries(metrics.divisionUtilization).map(([name, metric]) => ({
    name,
    utilization: metric.value,
    status: metric.status
  }));

  const resourceData = [
    { name: 'Total Capacity', value: metrics.totalCapacityHours.value },
    { name: 'Utilized', value: metrics.utilizedHours.value },
    { name: 'Available', value: metrics.availableHours.value },
    { name: 'Overtime', value: metrics.overtimeHours.value }
  ];

  const qualityData = [
    { subject: 'Schedule', value: metrics.scheduleAdherence.value, fullMark: 100 },
    { subject: 'Efficiency', value: metrics.resourceAllocationEfficiency.value, fullMark: 100 },
    { subject: 'Collaboration', value: metrics.crossDivisionCollaboration.value, fullMark: 100 },
    { subject: 'Planning', value: metrics.plannedVsActualHours.value, fullMark: 100 },
    { subject: 'Satisfaction', value: metrics.clientSatisfaction.value * 20, fullMark: 100 }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Metrics Dashboard</h1>
          <p className="text-gray-600">Real-time KPIs and analytics</p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={division} onValueChange={setDivision}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              <SelectItem value="HVAC">HVAC</SelectItem>
              <SelectItem value="Plumbing">Plumbing</SelectItem>
              <SelectItem value="Electrical">Electrical</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Overall Utilization"
          metric={metrics.overallUtilization}
          icon={<Activity className="h-5 w-5" />}
          size="large"
        />
        <MetricCard
          title="Active Projects"
          metric={metrics.activeProjects}
          icon={<Briefcase className="h-5 w-5" />}
          size="large"
        />
        <MetricCard
          title="Total Revenue"
          metric={metrics.totalRevenue}
          icon={<DollarSign className="h-5 w-5" />}
          size="large"
        />
        <MetricCard
          title="At Risk Projects"
          metric={metrics.atRiskProjects}
          icon={<AlertTriangle className="h-5 w-5" />}
          size="large"
        />
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="quality">Quality & Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Utilization Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Utilization Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Division Utilization */}
            <Card>
              <CardHeader>
                <CardTitle>Division Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={divisionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="utilization">
                      {divisionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.status === 'good'
                              ? COLORS.good
                              : entry.status === 'warning'
                              ? COLORS.warning
                              : COLORS.critical
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Additional Operation Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Projects On Schedule"
              metric={metrics.projectsOnSchedule}
              icon={<CheckCircle className="h-5 w-5" />}
            />
            <MetricCard
              title="Completion Rate"
              metric={metrics.projectCompletionRate}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <MetricCard
              title="Avg Project Duration"
              metric={metrics.averageProjectDuration}
              icon={<Clock className="h-5 w-5" />}
            />
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Revenue per Employee"
              metric={metrics.revenuePerEmployee}
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              title="Profit Margin"
              metric={metrics.profitMargin}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MetricCard
              title="Cash Flow"
              metric={metrics.cashFlowStatus}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <MetricCard
              title="Outstanding Invoices"
              metric={metrics.outstandingInvoices}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Resource Allocation */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={resourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}hrs`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {resourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Employee Metrics */}
            <div className="space-y-4">
              <MetricCard
                title="Employee Utilization"
                metric={metrics.employeeUtilization}
                icon={<Users className="h-5 w-5" />}
              />
              <MetricCard
                title="Overtime Hours"
                metric={metrics.overtimeHours}
                icon={<Clock className="h-5 w-5" />}
              />
              <MetricCard
                title="Available Hours"
                metric={metrics.availableHours}
                icon={<Activity className="h-5 w-5" />}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quality Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={qualityData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Indicators */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Capacity Risk Score</span>
                      <span className="text-sm font-medium">
                        {metrics.capacityRiskScore.value}/100
                      </span>
                    </div>
                    <Progress
                      value={metrics.capacityRiskScore.value}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Schedule Adherence</span>
                      <span className="text-sm font-medium">
                        {metrics.scheduleAdherence.value}%
                      </span>
                    </div>
                    <Progress
                      value={metrics.scheduleAdherence.value}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Client Satisfaction</span>
                      <span className="text-sm font-medium">
                        {metrics.clientSatisfaction.value}/5
                      </span>
                    </div>
                    <Progress
                      value={metrics.clientSatisfaction.value * 20}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  title="Schedule Conflicts"
                  metric={metrics.scheduleConflicts}
                  icon={<XCircle className="h-5 w-5" />}
                />
                <MetricCard
                  title="Rework Rate"
                  metric={metrics.reworkRate}
                  icon={<AlertTriangle className="h-5 w-5" />}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}