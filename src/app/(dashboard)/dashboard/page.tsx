'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useDevices } from '@/hooks/useDevices';
import { useWebSocket } from '@/hooks/useWebSocket';
import { deviceAPI, alertAPI, scheduleAPI, eventAPI } from '@/lib/api';
import { Home, Zap, AlertCircle, Calendar, Activity, Settings, LogOut } from 'lucide-react';

// After running: npx shadcn@latest add card badge button
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  activeAlerts: number;
  activeSchedules: number;
  recentEvents: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { devices, controlDevice } = useDevices();
  const [stats, setStats] = useState<DashboardStats>({
    totalDevices: 0,
    onlineDevices: 0,
    activeAlerts: 0,
    activeSchedules: 0,
    recentEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  // WebSocket for real-time updates
  useWebSocket((data) => {
    console.log('Real-time update:', data);
    if (data.type === 'device_update') {
      // Refresh devices
    }
  });

  useEffect(() => {

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status === 'offline');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {/* <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Home className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Smart Home</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Hi, {user?.name}!</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header> */}

      {/* Navigation */}
      {/* <nav className="border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="flex space-x-6 h-12 items-center overflow-x-auto">
            <Link href="/dashboard" className="text-sm font-medium text-primary border-b-2 border-primary px-1">
              Dashboard
            </Link>
            <Link href="/devices" className="text-sm text-muted-foreground hover:text-foreground">
              Devices
            </Link>
            <Link href="/rooms" className="text-sm text-muted-foreground hover:text-foreground">
              Rooms
            </Link>
            <Link href="/schedules" className="text-sm text-muted-foreground hover:text-foreground">
              Schedules
            </Link>
            <Link href="/alerts" className="text-sm text-muted-foreground hover:text-foreground">
              Alerts
            </Link>
            <Link href="/sensors" className="text-sm text-muted-foreground hover:text-foreground">
              Sensors
            </Link>
            <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground">
              Events
            </Link>
            <Link href="/analytics" className="text-sm text-muted-foreground hover:text-foreground">
              Analytics
            </Link>
            <Link href="/face-recognition" className="text-sm text-muted-foreground hover:text-foreground">
              Face ID
            </Link>
          </div>
        </div>
      </nav> */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
      <h1 className='h1'>Dashboard</h1>
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
                <CardDescription>Quick access to your most used devices</CardDescription>
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
                          disabled={device.status !== 'online'}
                        >
                          {device.state.is_on ? '💡 Turn Off' : 'Turn On'}
                        </Button>
                      )}
                      
                      {device.device_type === 'door_lock' && (
                        <Button
                          variant={device.state.is_locked ? 'destructive' : 'default'}
                          className="w-full"
                          onClick={() => controlDevice(device._id, device.state.is_locked ? 'unlock' : 'lock')}
                          disabled={device.status !== 'online'}
                        >
                          {device.state.is_locked ? '🔓 Unlock' : '🔒 Lock'}
                        </Button>
                      )}

                      {device.device_type === 'temperature_sensor' && (
                        <div className="text-center py-2">
                          <div className="text-2xl font-bold text-primary">
                            {device.state.temperature}°C
                          </div>
                          {device.state.humidity && (
                            <div className="text-sm text-muted-foreground">
                              Humidity: {device.state.humidity}%
                            </div>
                          )}
                        </div>
                      )}

                      {device.device_type === 'rain_sensor' && (
                        <div className="text-center py-2">
                          <div className="text-lg font-medium">
                            {device.state.is_raining ? '🌧️ Raining' : '☀️ Dry'}
                          </div>
                          {device.state.is_raining && (
                            <div className="text-sm text-muted-foreground">
                              Intensity: {device.state.rain_intensity}/10
                            </div>
                          )}
                        </div>
                      )}

                      {device.device_type === 'clothes_rack' && (
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => controlDevice(device._id, 'extend')}
                            disabled={device.status !== 'online'}
                          >
                            ⬆️ Extend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => controlDevice(device._id, 'retract')}
                            disabled={device.status !== 'online'}
                          >
                            ⬇️ Retract
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No devices found</p>
                <Link href="/devices">
                  <Button>Add Your First Device</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
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
      </main>
    </div>
  );
}
