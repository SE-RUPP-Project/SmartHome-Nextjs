'use client';

import { useState, useEffect } from 'react';
import { scheduleAPI, deviceAPI } from '@/lib/api';
import { Plus, Trash2, Edit, Play, Pause, Calendar, Clock } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

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
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cron_expression: '0 7 * * *', // Default: 7 AM daily
    device_id: '',
    action: '',
  });

  useEffect(() => {
    fetchSchedules();
    fetchDevices();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await scheduleAPI.getAll();
      setSchedules(response.data.data);
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

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await scheduleAPI.create({
        name: formData.name,
        cron_expression: formData.cron_expression,
        actions: [
          {
            device_id: formData.device_id,
            action: formData.action,
          },
        ],
      });
      await fetchSchedules();
      setIsAddDialogOpen(false);
      setFormData({ name: '', cron_expression: '0 7 * * *', device_id: '', action: '' });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchedule = async (scheduleId: string) => {
    try {
      await scheduleAPI.toggle(scheduleId);
      await fetchSchedules();
    } catch (error) {
      alert('Failed to toggle schedule');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteScheduleId) return;
    
    try {
      await scheduleAPI.delete(deleteScheduleId);
      await fetchSchedules();
      setDeleteScheduleId(null);
    } catch (error) {
      alert('Failed to delete schedule');
    }
  };

  const parseCronDescription = (cron: string): string => {
    // Simple cron parser for display
    const parts = cron.split(' ');
    if (parts[0] === '0' && parts[1] === '7') return 'Daily at 7:00 AM';
    if (parts[0] === '0' && parts[1] === '19') return 'Daily at 7:00 PM';
    return 'Custom schedule';
  };

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Schedules</h1>
          <p className="text-muted-foreground">Automate your smart home</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddSchedule}>
              <DialogHeader>
                <DialogTitle>Create Schedule</DialogTitle>
                <DialogDescription>
                  Automate device actions at specific times
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
                  <Label htmlFor="cron">Time</Label>
                  <Select
                    value={formData.cron_expression}
                    onValueChange={(value) => setFormData({ ...formData, cron_expression: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0 7 * * *">7:00 AM (Daily)</SelectItem>
                      <SelectItem value="0 8 * * *">8:00 AM (Daily)</SelectItem>
                      <SelectItem value="0 19 * * *">7:00 PM (Daily)</SelectItem>
                      <SelectItem value="0 22 * * *">10:00 PM (Daily)</SelectItem>
                      <SelectItem value="0 7 * * 1-5">7:00 AM (Weekdays)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="device">Device</Label>
                  <Select
                    value={formData.device_id}
                    onValueChange={(value) => setFormData({ ...formData, device_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.filter(d => d.device_type === 'light' || d.device_type === 'door_lock').map(device => (
                        <SelectItem key={device._id} value={device._id}>
                          {device.name}
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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
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
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Schedule'}
                </Button>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{schedule.name}</CardTitle>
                    <CardDescription>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {parseCronDescription(schedule.cron_expression)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant={schedule.is_enabled ? 'default' : 'secondary'}>
                    {schedule.is_enabled ? 'Active' : 'Paused'}
                  </Badge>
                  <Switch
                    checked={schedule.is_enabled}
                    onCheckedChange={() => handleToggleSchedule(schedule._id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Executed {schedule.run_count} times</p>
                  {schedule.next_run && (
                    <p>Next run: {new Date(schedule.next_run).toLocaleString()}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteScheduleId(schedule._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {schedules.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No schedules yet</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Schedule
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
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
