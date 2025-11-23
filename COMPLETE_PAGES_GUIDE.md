# 🎨 Complete Implementation Guide - All Pages with shadcn/ui

**Complete code for all 11 pages covering all 11 backend services**

---

## 📋 Table of Contents

1. [Dashboard Page](#1-dashboard-page) - Overview of everything
2. [Devices Page](#2-devices-page) - Device Service (3002)
3. [Rooms Page](#3-rooms-page) - Room Service (3003)
4. [Schedules Page](#4-schedules-page) - Schedule Service (3004)
5. [Events Page](#5-events-page) - Event Service (3005)
6. [Sensors Page](#6-sensors-page) - Sensor Service (3006)
7. [Alerts Page](#7-alerts-page) - Alert Service (3007)
8. [Analytics Page](#8-analytics-page) - Analytics Service (3008)
9. [Face Recognition Page](#9-face-recognition-page) - Face Recognition Service (5000)
10. [Settings Page](#10-settings-page) - User Service (3001)

**Note:** WebSocket Service (3009) and API Gateway (4000) are used throughout all pages.

---

## 1. Dashboard Page

**Path:** `src/app/dashboard/page.tsx`

**Services Used:** All services for overview

```typescript
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
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchDashboardData();
  }, [isAuthenticated, router]);

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
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
      </header>

      {/* Navigation */}
      <nav className="border-b bg-background">
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
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
```

---

## 2. Devices Page

**Path:** `src/app/devices/page.tsx`

**Service:** Device Service (3002)

```typescript
'use client';

import { useState } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { deviceAPI } from '@/lib/api';
import { Plus, Trash2, Edit, Power, Lock, Unlock, Lightbulb } from 'lucide-react';

// After: npx shadcn@latest add card button dialog input label select badge alert-dialog
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function DevicesPage() {
  const { devices, fetchDevices, controlDevice } = useDevices();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    device_type: '',
    mac_address: '',
    room_id: '',
  });

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await deviceAPI.create(formData);
      await fetchDevices();
      setIsAddDialogOpen(false);
      setFormData({ name: '', device_type: '', mac_address: '', room_id: '' });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deleteDeviceId) return;
    
    try {
      await deviceAPI.delete(deleteDeviceId);
      await fetchDevices();
      setDeleteDeviceId(null);
    } catch (error) {
      alert('Failed to delete device');
    }
  };

  const filteredDevices = filter === 'all' 
    ? devices 
    : devices.filter(d => d.device_type === filter);

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Devices</h1>
          <p className="text-muted-foreground">Manage all your smart home devices</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddDevice}>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>
                  Register a new smart device to your home
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Device Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Living Room Light"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="device_type">Device Type</Label>
                  <Select
                    value={formData.device_type}
                    onValueChange={(value) => setFormData({ ...formData, device_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">💡 Light</SelectItem>
                      <SelectItem value="door_lock">🔒 Door Lock</SelectItem>
                      <SelectItem value="temperature_sensor">🌡️ Temperature Sensor</SelectItem>
                      <SelectItem value="motion_sensor">👁️ Motion Sensor</SelectItem>
                      <SelectItem value="smoke_detector">🔥 Smoke Detector</SelectItem>
                      <SelectItem value="rain_sensor">🌧️ Rain Sensor</SelectItem>
                      <SelectItem value="clothes_rack">👕 Clothes Rack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mac_address">MAC Address</Label>
                  <Input
                    id="mac_address"
                    value={formData.mac_address}
                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Device'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="light">Lights</SelectItem>
            <SelectItem value="door_lock">Door Locks</SelectItem>
            <SelectItem value="temperature_sensor">Temperature</SelectItem>
            <SelectItem value="motion_sensor">Motion</SelectItem>
            <SelectItem value="smoke_detector">Smoke</SelectItem>
            <SelectItem value="rain_sensor">Rain</SelectItem>
            <SelectItem value="clothes_rack">Clothes Rack</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => (
          <Card key={device._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{device.name}</CardTitle>
                  <CardDescription className="capitalize">
                    {device.device_type.replace('_', ' ')}
                  </CardDescription>
                </div>
                <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                  {device.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Device Controls */}
              {device.device_type === 'light' && (
                <Button
                  variant={device.state.is_on ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => controlDevice(device._id, device.state.is_on ? 'turn_off' : 'turn_on')}
                  disabled={device.status !== 'online'}
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {device.state.is_on ? 'Turn Off' : 'Turn On'}
                </Button>
              )}

              {device.device_type === 'door_lock' && (
                <Button
                  variant={device.state.is_locked ? 'destructive' : 'default'}
                  className="w-full"
                  onClick={() => controlDevice(device._id, device.state.is_locked ? 'unlock' : 'lock')}
                  disabled={device.status !== 'online'}
                >
                  {device.state.is_locked ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  {device.state.is_locked ? 'Unlock' : 'Lock'}
                </Button>
              )}

              {device.device_type === 'temperature_sensor' && (
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary">
                    {device.state.temperature}°C
                  </div>
                  {device.state.humidity && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Humidity: {device.state.humidity}%
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2 border-t">
                <Button variant="ghost" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleteDeviceId(device._id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No devices found</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Device
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDeviceId} onOpenChange={() => setDeleteDeviceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDevice} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

---

## Continue with remaining pages...

Due to length, I'll create separate files for each remaining page. The pattern is established above!

Each page follows the same structure:
1. Import shadcn/ui components
2. Use API client from `@/lib/api`
3. State management with hooks
4. Forms with validation
5. Loading states
6. Error handling
7. Responsive design

**Would you like me to continue with:**
- ✅ Rooms Page (Room Service)
- ✅ Schedules Page (Schedule Service)
- ✅ Events Page (Event Service)
- ✅ Sensors Page (Sensor Service)
- ✅ Alerts Page (Alert Service)
- ✅ Analytics Page (Analytics Service)
- ✅ Face Recognition Page (Face Recognition Service)

**All following the same shadcn/ui pattern!**
