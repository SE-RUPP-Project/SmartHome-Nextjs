'use client';

import { useState, useEffect } from 'react';
import { scheduleAPI, deviceAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Trash2, Edit, Calendar, Clock } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useRooms } from '@/hooks/useRooms';

interface Schedule {
  _id: string;
  name: string;
  cron_expression?: string;
  cron: string;
  device_id?: string;
  action?: string;
  actions?: Array<{
    device_id: string;
    action: string;
  }>;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  run_count: number;
  created_at: string;
}

// Helper to reverse Cron expression (e.g., "0 7 * * *") back to 12-hour time parts
const parseCronToTime = (cron: string) => {
  const parts = cron.split(' ');
  if (parts.length < 5) return { hour: "", minute: "", period: "" };

  const minute = parts[0];
  let hour = parseInt(parts[1]);
  let period = 'AM';

  if (isNaN(hour) || isNaN(parseInt(minute))) return { hour: "", minute: "", period: "" };

  if (hour === 0) {
    hour = 12;
    period = 'AM';
  } else if (hour === 12) {
    period = 'PM';
  } else if (hour > 12) {
    hour -= 12;
    period = 'PM';
  }

  return {
    hour: String(hour),
    minute: minute.padStart(2, '0'),
    period,
  };
};

// Helper to generate the cron string from 12-hour time parts
const generateCron = (t: { hour: string, minute: string, period: string }) => {
  const hour = parseInt(t.hour);
  const minute = parseInt(t.minute);

  if (isNaN(hour) || isNaN(minute) || !t.period) return "";

  let militaryHour: number;

  if (t.period === "PM" && hour !== 12) {
    militaryHour = hour + 12;
  } else if (t.period === "AM" && hour === 12) {
    militaryHour = 0;
  } else {
    militaryHour = hour;
  }

  return `${minute} ${militaryHour} * * *`;
};

export default function SchedulesPage() {
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const { rooms, fetchRooms } = useRooms();
  const [devices, setDevices] = useState<any[]>([]);

  // Dialog State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Role-based access control
  const canControl = user?.role === 'admin' || user?.role === 'family';
  const isAdmin = user?.role === 'admin';

  // Form State (used for both Add and Edit)
  const [formData, setFormData] = useState({
    name: '',
    cron_expression: '',
    device_id: '',
    action: '',
  });

  // Time Picker State (used for both Add and Edit)
  const [time, setTime] = useState({
    hour: "",
    minute: "",
    period: ""
  });

  // Get selected device type
  const selectedDevice = devices.find(d => d._id === formData.device_id);
  const selectedDeviceType = selectedDevice?.device_type;

  // Get available actions based on device type
  const getAvailableActions = () => {
    if (!selectedDeviceType) return [];

    switch (selectedDeviceType) {
      case 'light':
        return [
          { value: 'turn_on', label: 'Turn On' },
          { value: 'turn_off', label: 'Turn Off' }
        ];
      case 'door_lock':
        return [
          { value: 'lock', label: 'Lock' },
          { value: 'unlock', label: 'Unlock' }
        ];
      case 'clothes_rack':
        return [
          { value: 'extend', label: 'Extend' },
          { value: 'retract', label: 'Retract' }
        ];
      default:
        return [];
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchDevices();
    fetchRooms();
  }, []);

  // --- API FETCHERS ---

  const fetchSchedules = async () => {
    try {
      const response = await scheduleAPI.getAll();
      setSchedules(response.data.data.map((s: any) => ({
        ...s,
        cron: s.cron_expression || s.cron,
      })));
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await deviceAPI.getAll();
      setDevices(response.data.data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  // --- HANDLERS & UTILS ---

  const handleFormClose = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingSchedule(null);
    setFormData({ name: '', cron_expression: '', device_id: '', action: '' });
    setTime({ hour: '', minute: '', period: '' });
  };

  const handleTimeChange = (field: "hour" | "minute" | "period", value: string) => {
    const updated = { ...time, [field]: value };
    setTime(updated);

    const cron = generateCron(updated);
    setFormData({ ...formData, cron_expression: cron });
  };

  const handleDeviceChange = (deviceId: string) => {
    setFormData({ ...formData, device_id: deviceId, action: '' });
  };

  const parseCronDescription = (cron: string): string => {
    const timeParts = parseCronToTime(cron);
    if (!timeParts.hour || !timeParts.minute || !timeParts.period) return 'Custom/Complex Cron';

    const formattedMinute = timeParts.minute.padStart(2, '0');
    return `Daily at ${timeParts.hour}:${formattedMinute} ${timeParts.period}`;
  };

  const handleEditClick = (schedule: Schedule) => {
    if (!isAdmin) return;

    const [firstAction] = schedule.actions ?? [];

    const safeAction =
      firstAction ??
      (schedule.device_id && schedule.action
        ? { device_id: schedule.device_id, action: schedule.action }
        : null);

    if (!safeAction) {
      console.error("Cannot edit malformed schedule:", schedule);
      return;
    }

    const { hour, minute, period } = parseCronToTime(schedule.cron);

    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      cron_expression: schedule.cron,
      device_id: safeAction.device_id,
      action: safeAction.action,
    });
    setTime({ hour, minute, period });
    setIsEditDialogOpen(true);
  };

  // --- CRUD OPERATIONS ---

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      alert('Only administrators can create or edit schedules');
      return;
    }

    setLoading(true);

    if (!formData.name || !formData.cron_expression || !formData.device_id || !formData.action) {
      alert('Please fill in all required fields (Name, Time, Device, and Action).');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.name,
        cron: formData.cron_expression,
        enabled: editingSchedule ? editingSchedule.enabled : true,
        device_id: formData.device_id,
        action: formData.action
      };

      if (editingSchedule) {
        await scheduleAPI.update(editingSchedule._id, payload);
      } else {
        await scheduleAPI.create(payload);
      }

      await fetchSchedules();
      handleFormClose();

    } catch (error: any) {
      console.error('Schedule save error:', error);
      alert(error.response?.data?.message || `Failed to ${editingSchedule ? 'update' : 'add'} schedule`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchedule = async (scheduleId: string, isEnabled: boolean) => {
    if (!isAdmin) {
      alert('Only administrators can toggle schedules');
      return;
    }

    try {
      await scheduleAPI.update(scheduleId, { enabled: isEnabled });
      setSchedules(prev => prev.map(s => s._id === scheduleId ? { ...s, enabled: isEnabled } : s));
      await fetchSchedules();
    } catch (error) {
      alert('Failed to toggle schedule');
      console.error('Toggle schedule error:', error);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteScheduleId || !isAdmin) return;

    try {
      await scheduleAPI.delete(deleteScheduleId);
      await fetchSchedules();
      setDeleteScheduleId(null);
    } catch (error) {
      alert('Failed to delete schedule');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Schedules</h1>
          <p className="text-muted-foreground">Automate your smart home</p>
        </div>

        {/* --- ADD SCHEDULE DIALOG --- */}
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            if (!open) handleFormClose();
            else setIsAddDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSaveSchedule}>
                <DialogHeader>
                  <DialogTitle>Create Schedule</DialogTitle>
                  <DialogDescription>
                    Automate device actions at specific times
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Schedule Name */}
                  <div>
                    <Label htmlFor="name">Schedule Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Morning Lights"
                      required
                    />
                  </div>

                  {/* Time Picker */}
                  <div>
                    <Label>Time</Label>
                    <div className="flex gap-2 mt-1">
                      <Select value={time.hour} onValueChange={(v) => handleTimeChange("hour", v)}>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => {
                            const hr = i + 1;
                            return <SelectItem key={hr} value={String(hr)}>{hr}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>

                      <Select value={time.minute} onValueChange={(v) => handleTimeChange("minute", v)}>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={time.period} onValueChange={(v) => handleTimeChange("period", v)}>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="AM/PM" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.cron_expression && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Cron: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{formData.cron_expression}</span>
                      </p>
                    )}
                  </div>

                  {/* Device Select */}
                  <div>
                    <Label htmlFor="device">Device</Label>
                    <Select
                      value={formData.device_id}
                      onValueChange={handleDeviceChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.filter(d =>
                          d.device_type === 'light' ||
                          d.device_type === 'clothes_rack'
                        ).map(device => (
                          <SelectItem key={device._id} value={device._id}>
                            {device.name} ({device.device_type.replace('_', ' ')}) ({rooms.find(r => r._id === device.room_id)?.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Select */}
                  <div>
                    <Label htmlFor="action">Action</Label>
                    <Select
                      value={formData.action}
                      onValueChange={(value) => setFormData({ ...formData, action: value })}
                      disabled={!formData.device_id}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.device_id ? "Select action" : "Select device first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableActions().map((action) => (
                          <SelectItem key={action.value} value={action.value}>
                            {action.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleFormClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !formData.cron_expression || !formData.device_id || !formData.action}>
                    {loading ? 'Creating...' : 'Create Schedule'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* --- EDIT SCHEDULE DIALOG --- */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (!open) handleFormClose();
          else setIsEditDialogOpen(true);
        }}>
          <DialogContent>
            <form onSubmit={handleSaveSchedule}>
              <DialogHeader>
                <DialogTitle>Edit Schedule: {editingSchedule?.name}</DialogTitle>
                <DialogDescription>
                  Update the time or action for this automation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Schedule Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Morning Lights"
                    required
                  />
                </div>

                <div>
                  <Label>Time</Label>
                  <div className="flex gap-2 mt-1">
                    <Select value={time.hour} onValueChange={(v) => handleTimeChange("hour", v)}>
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="HH" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => {
                          const hr = i + 1;
                          return <SelectItem key={hr} value={String(hr)}>{hr}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>

                    <Select value={time.minute} onValueChange={(v) => handleTimeChange("minute", v)}>
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={time.period} onValueChange={(v) => handleTimeChange("period", v)}>
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cron: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{formData.cron_expression || "Not selected"}</span>
                  </p>
                </div>

                <div>
                  <Label htmlFor="device">Device</Label>
                  <Select
                    value={formData.device_id}
                    onValueChange={handleDeviceChange}
                    required
                    disabled={isEditDialogOpen}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.filter(d =>
                        d.device_type === 'light' ||
                        d.device_type === 'door_lock' ||
                        d.device_type === 'clothes_rack'
                      ).map(device => (
                        <SelectItem key={device._id} value={device._id}>
                          {device.name} ({device.device_type.replace('_', ' ')}) ({rooms.find(r => r._id === device.room_id)?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={formData.action}
                    onValueChange={(value) => setFormData({ ...formData, action: value })}
                    disabled={!formData.device_id}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.device_id ? "Select action" : "Select device first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableActions().map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleFormClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !formData.cron_expression || !formData.device_id || !formData.action}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- SCHEDULES LIST --- */}
      <div className="space-y-4">
        {schedules.map((schedule) => {
          const [firstAction] = schedule.actions ?? [];

          const action =
            firstAction ??
            (schedule.device_id && schedule.action
              ? { device_id: schedule.device_id, action: schedule.action }
              : null);

          if (!action) {
            console.warn("Skipping malformed schedule:", schedule);
            return null;
          }

          const device = devices.find(d => d._id === action.device_id);
          const actionLabel = getAvailableActions().find(a => a.value === action.action)?.label || action.action || 'Unknown Action';

          return (
            <Card key={schedule._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{schedule.name}</CardTitle>
                      <CardDescription>
                        <Clock className="w-3 h-3 inline mr-1" />
                        Runs: {parseCronDescription(schedule.cron)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                      {schedule.enabled ? 'Active' : 'Paused'}
                    </Badge>
                    {isAdmin && (
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(checked) => handleToggleSchedule(schedule._id, checked)}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className='font-semibold'>
                      Action: <span className='text-foreground'>{actionLabel}</span> on <span className='text-foreground'>{device?.name || 'Device'}</span>
                    </p>
                    {schedule.next_run && (
                      <p>Next run: {new Date(schedule.next_run).toLocaleString()}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick({ ...schedule, actions: [action] })}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteScheduleId(schedule._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {schedules.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No schedules yet</p>
          {isAdmin && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Schedule
            </Button>
          )}
        </div>
      )}

      {!canControl && (
        <div className="mt-8 p-4 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            View only - Contact admin to manage schedules
          </p>
        </div>
      )}

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <AlertDialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This schedule will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchedule} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}