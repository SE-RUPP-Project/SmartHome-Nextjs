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
