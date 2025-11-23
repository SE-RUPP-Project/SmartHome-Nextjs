'use client';

import { useState, useEffect } from 'react';
import { alertAPI, deviceAPI } from '@/lib/api';
import { Plus, Trash2, Bell, BellOff, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface Alert {
  _id: string;
  name: string;
  device_id: string;
  alert_type: string;
  condition: {
    operator: string;
    value: number | string;
  };
  enabled: boolean;
  notification_method: string;
  last_triggered?: string;
  trigger_count: number;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    device_id: '',
    alert_type: 'temperature',
    operator: '>',
    value: '',
    notification_method: 'push',
  });

  useEffect(() => {
    fetchAlerts();
    fetchDevices();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await alertAPI.getAll();
      setAlerts(response.data.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
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

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await alertAPI.create({
        name: formData.name,
        device_id: formData.device_id,
        alert_type: formData.alert_type,
        condition: {
          operator: formData.operator,
          value: parseFloat(formData.value),
        },
        notification_method: formData.notification_method,
      });
      await fetchAlerts();
      setIsAddDialogOpen(false);
      setFormData({
        name: '',
        device_id: '',
        alert_type: 'temperature',
        operator: '>',
        value: '',
        notification_method: 'push',
      });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add alert');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlert = async (alertId: string, currentState: boolean) => {
    try {
      await alertAPI.update(alertId, { enabled: !currentState });
      await fetchAlerts();
    } catch (error) {
      alert('Failed to toggle alert');
    }
  };

  const handleDeleteAlert = async () => {
    if (!deleteAlertId) return;
    
    try {
      await alertAPI.delete(deleteAlertId);
      await fetchAlerts();
      setDeleteAlertId(null);
    } catch (error) {
      alert('Failed to delete alert');
    }
  };

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Get notified when conditions are met</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddAlert}>
              <DialogHeader>
                <DialogTitle>Create Alert</DialogTitle>
                <DialogDescription>
                  Set up notifications for device conditions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Alert Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="High Temperature Alert"
                    required
                  />
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
                      {devices.map(device => (
                        <SelectItem key={device._id} value={device._id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alert_type">Alert Type</Label>
                  <Select
                    value={formData.alert_type}
                    onValueChange={(value) => setFormData({ ...formData, alert_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="temperature">Temperature</SelectItem>
                      <SelectItem value="humidity">Humidity</SelectItem>
                      <SelectItem value="motion">Motion</SelectItem>
                      <SelectItem value="smoke">Smoke</SelectItem>
                      <SelectItem value="door_open">Door Open</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="operator">Condition</Label>
                    <Select
                      value={formData.operator}
                      onValueChange={(value) => setFormData({ ...formData, operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">Greater than</SelectItem>
                        <SelectItem value="<">Less than</SelectItem>
                        <SelectItem value=">=">Greater or equal</SelectItem>
                        <SelectItem value="<=">Less or equal</SelectItem>
                        <SelectItem value="==">Equal to</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="value">Value</Label>
                    <Input
                      id="value"
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="30"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notification">Notification Method</Label>
                  <Select
                    value={formData.notification_method}
                    onValueChange={(value) => setFormData({ ...formData, notification_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Push Notification</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="all">All Methods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Alert'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <Card key={alert._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    alert.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {alert.enabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{alert.name}</CardTitle>
                    <CardDescription>
                      {alert.alert_type} {alert.condition.operator} {alert.condition.value}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant={alert.enabled ? 'default' : 'secondary'}>
                    {alert.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                  <Switch
                    checked={alert.enabled}
                    onCheckedChange={() => handleToggleAlert(alert._id, alert.enabled)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Triggered {alert.trigger_count} times</p>
                  <p className="capitalize">Notification: {alert.notification_method}</p>
                  {alert.last_triggered && (
                    <p>Last: {new Date(alert.last_triggered).toLocaleString()}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteAlertId(alert._id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No alerts configured</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Alert
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAlertId} onOpenChange={() => setDeleteAlertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAlert} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
