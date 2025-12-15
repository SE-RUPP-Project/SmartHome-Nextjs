'use client';

import { useState, useEffect } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { useWebSocket } from '@/hooks/useWebSocket';
import { deviceAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Trash2, Edit, Power, Lock, Unlock, Lightbulb } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useRooms } from '@/hooks/useRooms';

export default function DevicesPage() {
  const { devices, setDevices, fetchDevices, controlDevice } = useDevices();
  const { rooms, fetchRooms } = useRooms();
  const { isConnected, on } = useWebSocket();
  const { user } = useAuthStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);

  const canControl = user?.role === 'admin' || user?.role === 'family';
  const isAdmin = user?.role === 'admin';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    device_type: '',
    mac_address: '',
    room_id: '',
    supports_face_scan: false,
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    room_id: '',
    supports_face_scan: false
  });

  useEffect(() => {
    fetchDevices();
    fetchRooms();
  }, [fetchDevices, fetchRooms]);

  // WebSocket listeners with better debugging
  useEffect(() => {
    if (!isConnected) {
      console.log('⏳ WebSocket not connected yet, waiting...');
      return;
    }

    console.log('✅ Setting up WebSocket listeners');

    // Listen for device updates
    const unsubscribe1 = on('device:update', (data: any) => {
      console.log('📡 Received device:update:', data);

      setDevices((prev: any[]) => {
        const updated = prev.map(device => {
          if (device._id === data.device_id) {
            console.log(`🔄 Updating device ${device.name}:`, data.data);
            return {
              ...device,
              status: data.data.status || device.status,
              state: { ...device.state, ...data.data.state },
              last_updated: new Date()
            };
          }
          return device;
        });
        return updated;
      });
    });

    // Listen for notifications (including offline)
    const unsubscribe2 = on('notification', (data: any) => {
      console.log('📢 Received notification:', data);

      if (data.type === 'device_offline') {
        console.log('⚠️ Marking all devices offline');
        setDevices((prev: any[]) => prev.map(device => ({
          ...device,
          status: 'offline'
        })));
      }
    });

    return () => {
      console.log('🧹 Cleaning up WebSocket listeners');
      unsubscribe1();
      unsubscribe2();
    };
  }, [isConnected, on, setDevices]);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        device_type: formData.device_type,
        mac_address: formData.mac_address,
      };

      // Only add room_id if it's not empty and not "none"
      if (formData.room_id && formData.room_id !== 'none') {
        payload.room_id = formData.room_id;
      }

      if (formData.device_type === 'door_lock' && formData.supports_face_scan) {
        payload.supports_face_scan = formData.supports_face_scan;
      }

      await deviceAPI.create(payload);
      await fetchDevices();
      setIsAddDialogOpen(false);
      setFormData({ name: '', device_type: '', mac_address: '', room_id: '', supports_face_scan: false });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;

    setLoading(true);

    try {
      await deviceAPI.update(editingDevice._id, editFormData);
      await fetchDevices();
      setIsEditDialogOpen(false);
      setEditingDevice(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update device');
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

  // Updated logic to combine type and room filters
  const filteredDevices = devices.filter(device => {
    const matchesType = filter === 'all' || device.device_type === filter;
    const matchesRoom = roomFilter === 'all' || device.room_id === roomFilter;
    return matchesType && matchesRoom;
  });

  const handleEditClick = (device: any) => {
    setEditingDevice(device);
    setEditFormData({
      name: device.name,
      room_id: device.room_id || '',
      supports_face_scan: device.state?.is_face_scan || false,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Devices</h1>
          <p className="text-muted-foreground">Manage all your smart home devices</p>
        </div>
        {isAdmin && (
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
                  {/* <div>
                    <Label htmlFor="mac_address">MAC Address</Label>
                    <Input
                      id="mac_address"
                      value={formData.mac_address}
                      onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                      placeholder="AA:BB:CC:DD:EE:FF"
                      required
                    />
                  </div> */}
                  {/* <div>
                    <Label htmlFor="room_id">Room (Optional)</Label>
                    <Select
                      value={formData.room_id ?? ''}
                      onValueChange={(value) => setFormData({ ...formData, room_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Room</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room._id} value={room._id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div> */}
                  {formData.device_type === 'door_lock' && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="face_scan"
                        checked={formData.supports_face_scan}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          supports_face_scan: typeof checked === 'boolean' ? checked : checked === 'indeterminate' ? false : true
                        })}
                      />
                      <label
                        htmlFor="face_scan"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Facial Recognition (Face Scan)
                      </label>
                    </div>
                  )}
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
        )}
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-4 flex-wrap">
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
        <Select value={roomFilter} onValueChange={setRoomFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by room" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            {rooms.map((room) => (
              <SelectItem key={room._id} value={room._id}>
                {room.name}
              </SelectItem>
            ))}
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
                <Badge
                  variant={device.status === 'online' ? 'default' : 'secondary'}
                  className={device.status === 'online' ? 'bg-green-500' : ''}
                >
                  <span className={`w-2 h-2 rounded-full mr-1 ${device.status === 'online' ? 'bg-green-200 animate-pulse' : 'bg-gray-200'
                    }`} />
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
                  disabled={device.status !== 'online' || !canControl}
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
                  disabled={device.status !== 'online' || !canControl}
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

              {device.device_type === 'motion_sensor' && (
                <div className="text-center py-4">
                  <div className="text-xl font-semibold text-primary">
                    {device.state.motion_detected ? 'Motion Detected' : 'No Motion'}
                  </div>
                  
                  {/* <Button
                    variant={device.state.motion_armed_mode ? 'destructive' : 'default'}
                    className="w-full"
                    onClick={() => controlDevice(device._id, device.state.motion_armed_mode ? 'armed_mode' : 'no_armed_mode')}
                    disabled={device.status !== 'online' || !canControl}
                  >
                  {/* {device.state.is_locked ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />} */}
                    {device.state.motion_armed_mode ? 'Open Armed Mode' : 'Disabled Armed Mode'}
                  {/* </Button>  */}
                  
                </div>
              )}

              {device.device_type === 'smoke_detector' && (
                <div className="text-center py-4">
                  <div className="text-xl font-semibold text-primary">
                    {device.state.smoke_detected ? 'Smoke Detected' : 'No Smoke'}
                  </div>
                </div>
              )}

              {device.device_type === 'rain_sensor' && (
                <div className="text-center py-4">
                  <div className="text-xl font-semibold text-primary">
                    {device.state.rain_detected ? 'Rain Detected' : 'No Rain'}
                  </div>
                </div>
              )}

              {device.device_type === 'clothes_rack' && (
                <div className="text-center py-4 text-primary">
                  <div className="text-xl font-semibold">
                    {device.state.rack_state === 'extended' ? 'Rack Extended' : 'Rack Retracted'}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2 border-t">
                {isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditClick(device)}
                    >
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
                  </>
                )}
              </div>
              {!canControl && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  View only - Contact admin for control access
                </p>
              )}
              <div className='text-sm text-muted-foreground'>Last Updated: <br />{new Date(device.last_updated).toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No devices found</p>
          {isAdmin && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Device
            </Button>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditDevice}>
            <DialogHeader>
              <DialogTitle>Edit Device</DialogTitle>
              <DialogDescription>
                Update device information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Device Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Living Room Light"
                  required
                />
              </div>

              {editingDevice?.device_type === 'door_lock' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_face_scan"
                    checked={editFormData.supports_face_scan || false}
                    onCheckedChange={(checked) => setEditFormData({
                      ...editFormData,
                      supports_face_scan: typeof checked === 'boolean' ? checked : checked === 'indeterminate' ? false : true
                    })}
                  />
                  <label
                    htmlFor="edit_face_scan"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Facial Recognition (Face Scan)
                  </label>
                </div>
              )}

              <div className='hidden'>
                <Label htmlFor="edit-room">Room ID (Optional)</Label>
                <Input
                  id="edit-room"
                  value={editFormData.room_id}
                  onChange={(e) => setEditFormData({ ...editFormData, room_id: e.target.value })}
                  placeholder="Enter room ID"
                  hidden
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingDevice(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Device'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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