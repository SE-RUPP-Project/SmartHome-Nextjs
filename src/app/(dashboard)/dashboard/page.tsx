'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useDevices } from '@/hooks/useDevices';
import { deviceAPI, alertAPI, scheduleAPI, eventAPI } from '@/lib/api';
import { Home, Zap, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { devices, controlDevice, fetchDevices } = useDevices();
  const [stats, setStats] = useState({ totalDevices: 0, onlineDevices: 0, activeAlerts: 0, activeSchedules: 0, recentEvents: 0 });
  const [loading, setLoading] = useState(true);

  const canControl = user?.role === 'admin' || user?.role === 'family';

  useEffect(() => {
    fetchDashboardData();
    fetchDevices();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [deviceStatsRes, alertStatsRes, schedulesRes, eventsRes] = await Promise.all([
        deviceAPI.getStats(),
        alertAPI.getStats(),
        scheduleAPI.getAll(),
        eventAPI.getAll({ limit: 10 }),
      ]);

      const deviceStats = deviceStatsRes.data.data;
      const alertStats = alertStatsRes.data.data;
      const schedules = schedulesRes.data.data;
      const events = eventsRes.data.data;

      setStats({
        totalDevices: deviceStats.total,
        onlineDevices: deviceStats.online,
        activeAlerts: alertStats.enabled,
        activeSchedules: schedules.filter((s: any) => s.is_enabled).length,
        recentEvents: events.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-5">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your smart home stats</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDevices}</div>
              <p className="text-xs text-muted-foreground">
                {stats.onlineDevices} online, {stats.totalDevices - stats.onlineDevices} offline
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.onlineDevices}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.onlineDevices / stats.totalDevices) * 100) || 0}% uptime
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.activeAlerts}</div>
              <p className="text-xs text-muted-foreground">Monitoring your home</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Schedules</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeSchedules}</div>
              <p className="text-xs text-muted-foreground">Active automations</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Devices */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Devices</CardTitle>
                <CardDescription>Quick access to devices</CardDescription>
              </div>
              <Link href="/devices">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {devices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.slice(0, 6).map((device) => (
                  <Card key={device._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{device.name}</CardTitle>
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                          {device.status}
                        </Badge>
                      </div>
                      <CardDescription className="capitalize">
                        {device.device_type.replace('_', ' ')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {device.device_type === 'light' && (
                        <Button
                          variant={device.state.is_on ? 'default' : 'outline'}
                          className="w-full"
                          onClick={() => controlDevice(device._id, device.state.is_on ? 'turn_off' : 'turn_on')}
                          disabled={device.status !== 'online' || !canControl}
                        >
                          {device.state.is_on ? '💡 Turn Off' : 'Turn On'}
                        </Button>
                      )}

                      {device.device_type === 'door_lock' && (
                        <Button
                          variant={device.state.is_locked ? 'destructive' : 'default'}
                          className="w-full"
                          onClick={() => controlDevice(device._id, device.state.is_locked ? 'unlock' : 'lock')}
                          disabled={device.status !== 'online' || !canControl}
                        >
                          {device.state.is_locked ? '🔓 Unlock' : '🔒 Lock'}
                        </Button>
                      )}

                      {device.device_type === 'temperature_sensor' && (
                        <div className="text-center py-2">
                          <div className="text-2xl font-bold text-primary">{device.state.temperature}°C</div>
                          {device.state.humidity && (
                            <div className="text-sm text-muted-foreground">Humidity: {device.state.humidity}%</div>
                          )}
                        </div>
                      )}

                      {device.device_type === 'rain_sensor' && (
                        <div className="text-center py-2">
                          <div className="text-lg font-medium">
                            {device.state.is_raining ? '🌧️ Raining' : '☀️ Dry'}
                          </div>
                        </div>
                      )}

                      {device.device_type === 'clothes_rack' && (
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => controlDevice(device._id, 'extend')}
                            disabled={device.status !== 'online' || !canControl}
                          >
                            ⬆️ Extend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => controlDevice(device._id, 'retract')}
                            disabled={device.status !== 'online' || !canControl}
                          >
                            ⬇️ Retract
                          </Button>
                        </div>
                      )}
                      
                      {!canControl && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          View only - Contact admin for control access
                        </p>
                      )}
                      
                      <small className="text-muted-foreground block mt-2">
                        Last Updated: {new Date(device.last_updated).toLocaleString()}
                      </small>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No devices found</p>
                {canControl && (
                  <Link href="/devices">
                    <Button>Add Your First Device</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {canControl && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <Link href="/devices">
                <CardHeader>
                  <CardTitle className="text-base">Manage Devices</CardTitle>
                  <CardDescription>Add, edit, or remove devices</CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <Link href="/schedules">
                <CardHeader>
                  <CardTitle className="text-base">Create Schedule</CardTitle>
                  <CardDescription>Automate your home</CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <Link href="/alerts">
                <CardHeader>
                  <CardTitle className="text-base">Configure Alerts</CardTitle>
                  <CardDescription>Get notified of events</CardDescription>
                </CardHeader>
              </Link>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}