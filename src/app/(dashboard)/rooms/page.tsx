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
    fetchData();
  }, []);

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
      await roomAPI.update(selectedRoom, selectedDevice);
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
