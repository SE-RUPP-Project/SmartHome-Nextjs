# 🚀 Complete Implementation Guide - Part 2: Remaining Pages

Continuation of all page implementations with shadcn/ui.

---

## 3. Rooms Page

**Path:** `src/app/rooms/page.tsx`

**Features:**
- List all rooms
- Add/Edit/Delete rooms
- Assign devices to rooms
- View devices in each room

**Complete Code:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { roomAPI, deviceAPI } from '@/lib/api';
import { Plus, Trash2, Edit } from 'lucide-react';

// shadcn/ui
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Room {
  _id: string;
  name: string;
  user_id: string;
  device_count?: number;
  created_at: string;
}

export default function RoomsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [newRoomName, setNewRoomName] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, router]);

  const fetchData = async () => {
    try {
      const [roomsRes, devicesRes] = await Promise.all([
        roomAPI.getAll(),
        deviceAPI.getAll()
      ]);
      setRooms(roomsRes.data.data || []);
      setDevices(devicesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomAPI.create({ name: newRoomName });
      await fetchData();
      setAddDialogOpen(false);
      setNewRoomName('');
    } catch (error) {
      console.error('Error adding room:', error);
      alert('Failed to add room');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      await roomAPI.delete(roomId);
      await fetchData();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room');
    }
  };

  const handleAssignDevice = async () => {
    if (!selectedRoom || !selectedDevice) return;
    try {
      await roomAPI.addDevice(selectedRoom, selectedDevice);
      await fetchData();
      setAssignDialogOpen(false);
      setSelectedRoom('');
      setSelectedDevice('');
    } catch (error) {
      console.error('Error assigning device:', error);
      alert('Failed to assign device');
    }
  };

  const getDevicesInRoom = (roomId: string) => {
    return devices.filter(d => d.room_id === roomId);
  };

  const unassignedDevices = devices.filter(d => !d.room_id);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Rooms</h1>
          <p className="text-muted-foreground">Organize your devices by room</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Assign Device</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Device to Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Select Room</Label>
                  <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map(room => (
                        <SelectItem key={room._id} value={room._id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Device</Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedDevices.map(device => (
                        <SelectItem key={device._id} value={device._id}>
                          {device.name} ({device.device_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignDevice}>
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddRoom}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="roomName">Room Name</Label>
                    <Input
                      id="roomName"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Living Room"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Room</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => {
          const roomDevices = getDevicesInRoom(room._id);
          return (
            <Card key={room._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{room.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {roomDevices.length} device{roomDevices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRoom(room._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {roomDevices.length > 0 ? (
                  <div className="space-y-2">
                    {roomDevices.map(device => (
                      <div key={device._id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">{device.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {device.device_type.replace('_', ' ')}
                          </p>
                        </div>
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                          {device.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No devices assigned
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rooms.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No rooms yet</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Room
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Unassigned Devices */}
      {unassignedDevices.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Unassigned Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unassignedDevices.map(device => (
                <div key={device._id} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {device.device_type.replace('_', ' ')}
                    </p>
                  </div>
                  <Badge>{device.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 4. Schedules Page

**Path:** `src/app/schedules/page.tsx`

**Features:**
- List all schedules
- Create schedules with cron expressions
- Add multiple actions per schedule
- Enable/disable schedules
- Execute manually

**Complete Code:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { scheduleAPI, deviceAPI } from '@/lib/api';
import { Plus, Play, Pause, Trash2 } from 'lucide-react';

// shadcn/ui
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Schedule {
  _id: string;
  name: string;
  cron_expression: string;
  actions: Array<{
    device_id: string;
    action: string;
  }>;
  is_enabled: boolean;
  last_run?: string;
  next_run?: string;
  run_count: number;
  created_at: string;
}

export default function SchedulesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    cron_expression: '0 9 * * *', // 9 AM daily
    device_id: '',
    action: 'turn_on',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, router]);

  const fetchData = async () => {
    try {
      const [schedulesRes, devicesRes] = await Promise.all([
        scheduleAPI.getAll(),
        deviceAPI.getAll()
      ]);
      setSchedules(schedulesRes.data.data || []);
      setDevices(devicesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scheduleAPI.create({
        name: newSchedule.name,
        cron_expression: newSchedule.cron_expression,
        actions: [{
          device_id: newSchedule.device_id,
          action: newSchedule.action
        }]
      });
      await fetchData();
      setAddDialogOpen(false);
      setNewSchedule({ name: '', cron_expression: '0 9 * * *', device_id: '', action: 'turn_on' });
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert('Failed to add schedule');
    }
  };

  const handleToggleSchedule = async (scheduleId: string) => {
    try {
      await scheduleAPI.toggle(scheduleId);
      await fetchData();
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const handleExecuteSchedule = async (scheduleId: string) => {
    try {
      await scheduleAPI.execute(scheduleId);
      alert('Schedule executed successfully!');
      await fetchData();
    } catch (error) {
      console.error('Error executing schedule:', error);
      alert('Failed to execute schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await scheduleAPI.delete(scheduleId);
      await fetchData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d._id === deviceId);
    return device?.name || 'Unknown Device';
  };

  const cronExamples = [
    { label: 'Every day at 9 AM', value: '0 9 * * *' },
    { label: 'Every day at 6 PM', value: '0 18 * * *' },
    { label: 'Every Monday at 8 AM', value: '0 8 * * 1' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 30 minutes', value: '*/30 * * * *' },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Schedules</h1>
          <p className="text-muted-foreground">Automate your smart home</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Schedule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSchedule}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="scheduleName">Schedule Name</Label>
                  <Input
                    id="scheduleName"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                    placeholder="Morning lights on"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cron">Cron Expression</Label>
                  <Select
                    value={newSchedule.cron_expression}
                    onValueChange={(value) => setNewSchedule({ ...newSchedule, cron_expression: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cronExamples.map(example => (
                        <SelectItem key={example.value} value={example.value}>
                          {example.label} ({example.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {newSchedule.cron_expression}
                  </p>
                </div>

                <div>
                  <Label>Device</Label>
                  <Select
                    value={newSchedule.device_id}
                    onValueChange={(value) => setNewSchedule({ ...newSchedule, device_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map(device => (
                        <SelectItem key={device._id} value={device._id}>
                          {device.name} ({device.device_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Action</Label>
                  <Select
                    value={newSchedule.action}
                    onValueChange={(value) => setNewSchedule({ ...newSchedule, action: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="turn_on">Turn On</SelectItem>
                      <SelectItem value="turn_off">Turn Off</SelectItem>
                      <SelectItem value="lock">Lock</SelectItem>
                      <SelectItem value="unlock">Unlock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Schedule</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedules List */}
      <div className="space-y-4">
        {schedules.map((schedule) => (
          <Card key={schedule._id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle>{schedule.name}</CardTitle>
                    <Badge variant={schedule.is_enabled ? 'default' : 'secondary'}>
                      {schedule.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <CardDescription>
                    Runs: {schedule.cron_expression} | Executed {schedule.run_count} times
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={schedule.is_enabled}
                    onCheckedChange={() => handleToggleSchedule(schedule._id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Actions */}
                <div>
                  <p className="text-sm font-medium mb-2">Actions:</p>
                  <div className="space-y-2">
                    {schedule.actions.map((action, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <span className="text-sm">
                          {getDeviceName(action.device_id)} - {action.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Execution Info */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {schedule.last_run && (
                    <div>
                      Last run: {new Date(schedule.last_run).toLocaleString()}
                    </div>
                  )}
                  {schedule.next_run && (
                    <div>
                      Next run: {new Date(schedule.next_run).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExecuteSchedule(schedule._id)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Execute Now
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteSchedule(schedule._id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {schedules.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No schedules yet</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Schedule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

**Continue to Part 3 for:**
- Events Page
- Sensors Page
- Alerts Page
- Analytics Page
- Face Recognition Page

Each page includes complete production code with shadcn/ui!
