'use client';

import { useState, useEffect } from 'react';
import { analyticsAPI } from '@/lib/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Zap, AlertTriangle, Thermometer, Calendar, Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Type definitions
interface DeviceTypeData {
  [key: string]: number;
}

interface EventBySeverityItem {
  severity: string;
  count: number;
}

interface EventByTypeItem {
  type: string;
  count: number;
}

interface RecentEvent {
  description: string;
  type: string;
  severity: string;
  timestamp: string;
}

interface DevicesData {
  total: number;
  online: number;
  offline: number;
  active_lights?: number;
  locked_doors?: number;
  by_type: DeviceTypeData;
}

interface EventsData {
  total: number;
  by_severity: EventBySeverityItem[];
  by_type: EventByTypeItem[];
  recent: RecentEvent[];
}

interface AlertsData {
  total: number;
  enabled: number;
  disabled: number;
  triggered: number;
}

interface TimelineItem {
  label: string;
  activity_count: number;
}

interface MostActiveDevice {
  device_name: string;
  count: number;
}

interface ActivityData {
  timeline: TimelineItem[];
  total_events: number;
  most_active_devices?: MostActiveDevice[];
}

interface DashboardData {
  devices: DevicesData;
  events: EventsData;
  alerts: AlertsData;
}

interface PieChartData {
  name: string;
  value: number;
}

interface BarChartData {
  name: string;
  count: number;
}

export default function AnalyticsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [timeRange, setTimeRange] = useState<string>('7');
  const [activityHours, setActivityHours] = useState<string>('24');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  useEffect(() => {
    fetchActivity();
  }, [activityHours]);

  const fetchAnalytics = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsAPI.getDashboard(parseInt(timeRange));
      console.log('Dashboard API Response:', response.data.data);
      setDashboardData(response.data.data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setError(error.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async (): Promise<void> => {
    try {
      const response = await analyticsAPI.getActivity(parseInt(activityHours));
      console.log('Activity API Response:', response.data.data);
      setActivityData(response.data.data);
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  // Process device type data for pie chart
  const getDeviceTypeData = (): PieChartData[] => {
    if (!dashboardData?.devices?.by_type) return [];

    return Object.entries(dashboardData.devices.by_type).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value
    })).filter(item => item.value > 0);
  };

  // Process event severity data for pie chart
  const getEventSeverityData = (): PieChartData[] => {
    if (!dashboardData?.events?.by_severity) return [];

    return dashboardData.events.by_severity
      .filter(item => item.count > 0)
      .map(item => ({
        name: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
        value: item.count
      }));
  };

  // Process event types for bar chart
  const getEventTypeData = (): BarChartData[] => {
    if (!dashboardData?.events?.by_type) return [];

    return dashboardData.events.by_type
      .slice(0, 10)
      .map(item => ({
        name: item.type.split('.').pop() || item.type,
        count: item.count
      }));
  };

  // Process hourly activity
  const getHourlyActivityData = (): TimelineItem[] => {
    if (!activityData?.timeline) return [];
    return activityData.timeline;
  };

  const COLORS = {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    accent: 'hsl(var(--accent))',
    info: '#3b82f6',
    warning: '#f59e0b',
    error: '#ef4444',
    critical: '#dc2626',
    success: '#10b981'
  };

  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      info: COLORS.info,
      warning: COLORS.warning,
      error: COLORS.error,
      critical: COLORS.critical
    };
    return colors[severity.toLowerCase()] || COLORS.primary;
  };

  // Export functions
  const exportToJSON = (): void => {
    if (!dashboardData) return;

    const dataStr = JSON.stringify(dashboardData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = (): void => {
    if (!dashboardData) return;

    const csvRows: string[][] = [];

    csvRows.push(['Analytics Report', `Generated: ${new Date().toLocaleString()}`]);
    csvRows.push([]);

    csvRows.push(['Device Statistics']);
    csvRows.push(['Metric', 'Value']);
    csvRows.push(['Total Devices', dashboardData.devices?.total?.toString() || '0']);
    csvRows.push(['Online Devices', dashboardData.devices?.online?.toString() || '0']);
    csvRows.push(['Offline Devices', dashboardData.devices?.offline?.toString() || '0']);
    csvRows.push(['Active Lights', dashboardData.devices?.active_lights?.toString() || '0']);
    csvRows.push(['Locked Doors', dashboardData.devices?.locked_doors?.toString() || '0']);
    csvRows.push([]);

    if (dashboardData.devices?.by_type) {
      csvRows.push(['Device Types']);
      csvRows.push(['Type', 'Count']);
      Object.entries(dashboardData.devices.by_type).forEach(([type, count]) => {
        csvRows.push([type, count.toString()]);
      });
      csvRows.push([]);
    }

    csvRows.push(['Event Statistics']);
    csvRows.push(['Total Events', dashboardData.events?.total?.toString() || '0']);
    csvRows.push([]);

    if (dashboardData.events?.by_type) {
      csvRows.push(['Event Types']);
      csvRows.push(['Type', 'Count']);
      dashboardData.events.by_type.forEach(item => {
        csvRows.push([item.type, item.count.toString()]);
      });
      csvRows.push([]);
    }

    csvRows.push(['Alert Statistics']);
    csvRows.push(['Metric', 'Value']);
    csvRows.push(['Total Alerts', dashboardData.alerts?.total?.toString() || '0']);
    csvRows.push(['Enabled Alerts', dashboardData.alerts?.enabled?.toString() || '0']);
    csvRows.push(['Disabled Alerts', dashboardData.alerts?.disabled?.toString() || '0']);
    csvRows.push(['Triggered Alerts', dashboardData.alerts?.triggered?.toString() || '0']);

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async (): Promise<void> => {
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f4f4f4; font-weight: bold; }
          .stat-card { display: inline-block; margin: 10px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; min-width: 200px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #333; }
          .stat-label { color: #666; font-size: 14px; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Smart Home Analytics Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Period: Last ${timeRange} days</p>
        
        <h2>Summary</h2>
        <div>
          <div class="stat-card">
            <div class="stat-label">Total Events</div>
            <div class="stat-value">${dashboardData?.events?.total || 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Active Devices</div>
            <div class="stat-value">${dashboardData?.devices?.online || 0} / ${dashboardData?.devices?.total || 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Active Alerts</div>
            <div class="stat-value">${dashboardData?.alerts?.enabled || 0}</div>
          </div>
        </div>
        
        <h2>Device Statistics</h2>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Total Devices</td><td>${dashboardData?.devices?.total || 0}</td></tr>
          <tr><td>Online</td><td>${dashboardData?.devices?.online || 0}</td></tr>
          <tr><td>Offline</td><td>${dashboardData?.devices?.offline || 0}</td></tr>
          <tr><td>Active Lights</td><td>${dashboardData?.devices?.active_lights || 0}</td></tr>
          <tr><td>Locked Doors</td><td>${dashboardData?.devices?.locked_doors || 0}</td></tr>
        </table>
        
        ${dashboardData?.devices?.by_type ? `
        <h2>Device Types</h2>
        <table>
          <tr><th>Type</th><th>Count</th></tr>
          ${Object.entries(dashboardData.devices.by_type).map(([type, count]) =>
      `<tr><td>${type}</td><td>${count}</td></tr>`
    ).join('')}
        </table>
        ` : ''}
        
        <h2>Event Statistics</h2>
        <p>Total Events: ${dashboardData?.events?.total || 0}</p>
        
        ${dashboardData?.events?.by_type ? `
        <table>
          <tr><th>Event Type</th><th>Count</th></tr>
          ${dashboardData.events.by_type.slice(0, 10).map(item =>
      `<tr><td>${item.type}</td><td>${item.count}</td></tr>`
    ).join('')}
        </table>
        ` : ''}
        
        <h2>Alert Statistics</h2>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Total Alerts</td><td>${dashboardData?.alerts?.total || 0}</td></tr>
          <tr><td>Enabled</td><td>${dashboardData?.alerts?.enabled || 0}</td></tr>
          <tr><td>Disabled</td><td>${dashboardData?.alerts?.disabled || 0}</td></tr>
          <tr><td>Triggered</td><td>${dashboardData?.alerts?.triggered || 0}</td></tr>
        </table>
        
        <div class="footer">
          <p>Smart Home Analytics System - ${new Date().getFullYear()}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  // Distinct colors for pie charts with better visibility
  const PIE_CHART_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Orange
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Dark Orange
    '#6366f1', // Indigo
    '#14b8a6', // Teal
  ];

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Insights into your smart home</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.events?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.devices?.online || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.devices?.total || 0} total devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.alerts?.enabled || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.alerts?.triggered || 0} triggered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.devices?.total ?
                Math.round((dashboardData.devices.online / dashboardData.devices.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Devices online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          {/* <TabsTrigger value="activity">Activity</TabsTrigger> */}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
                <CardDescription>By device type</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const data = getDeviceTypeData();

                  if (data.length === 0) {
                    return (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No device data available
                      </div>
                    );
                  }

                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Event Severity */}
            <Card>
              <CardHeader>
                <CardTitle>Event Severity</CardTitle>
                <CardDescription>Distribution by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const data = getEventSeverityData();

                  if (data.length === 0) {
                    return (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No event data available
                      </div>
                    );
                  }

                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {data.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={getSeverityColor(entry.name)}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Latest system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData?.events?.recent?.slice(0, 5).map((event, index) => (
                  <div key={index} className="flex items-start justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{event.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        <Badge
                          variant={event.severity === 'critical' || event.severity === 'error' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {event.severity}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                )) || (
                    <p className="text-muted-foreground text-center py-4">No recent events</p>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Device Statistics</CardTitle>
                <CardDescription>Current device status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Devices</span>
                    <span className="text-2xl font-bold">{dashboardData?.devices?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Online</span>
                    <span className="text-2xl font-bold text-green-600">{dashboardData?.devices?.online || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-600">Offline</span>
                    <span className="text-2xl font-bold text-red-600">{dashboardData?.devices?.offline || 0}</span>
                  </div>
                  {dashboardData?.devices?.active_lights !== undefined && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Active Lights</span>
                      <span className="text-xl font-bold">{dashboardData.devices.active_lights}</span>
                    </div>
                  )}
                  {dashboardData?.devices?.locked_doors !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Locked Doors</span>
                      <span className="text-xl font-bold">{dashboardData.devices.locked_doors}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Device Types Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardData?.devices?.by_type || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${((count) / (dashboardData?.devices?.total || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Types</CardTitle>
              <CardDescription>Most common events in the last {timeRange} days</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const data = getEventTypeData();

                if (data.length === 0) {
                  return (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                      <Activity className="h-12 w-12 mb-2 opacity-50" />
                      <p>No event data available</p>
                      <p className="text-xs mt-1">Events will appear here once devices generate activity</p>
                    </div>
                  );
                }

                return (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Activity Timeline</h3>
              <p className="text-sm text-muted-foreground">Device control events by hour</p>
            </div>
            <Select value={activityHours} onValueChange={setActivityHours}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Last 6 hours</SelectItem>
                <SelectItem value="12">Last 12 hours</SelectItem>
                <SelectItem value="24">Last 24 hours</SelectItem>
                <SelectItem value="48">Last 48 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hourly Activity</CardTitle>
              <CardDescription>
                {activityData?.total_events || 0} events in the last {activityHours} hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const data = getHourlyActivityData();

                if (data.length === 0) {
                  return (
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mb-2 opacity-50" />
                      <p>No activity data available</p>
                      <p className="text-xs mt-1">Device control events will appear here</p>
                    </div>
                  );
                }

                return (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis
                        tick={{ fill: 'hsl(var(--foreground))' }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="activity_count"
                        stroke={COLORS.primary}
                        strokeWidth={2}
                        name="Activity"
                        dot={{ fill: COLORS.primary, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>

          {/* Most Active Devices */}
          {activityData?.most_active_devices && activityData.most_active_devices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Active Devices</CardTitle>
                <CardDescription>Devices with most control events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activityData.most_active_devices.map((device, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{device.device_name}</span>
                      </div>
                      <Badge variant="secondary">{device.count} events</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}