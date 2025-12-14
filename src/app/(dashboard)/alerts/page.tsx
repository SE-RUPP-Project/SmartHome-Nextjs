'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { alertAPI, deviceAPI } from '@/lib/api';

// --- Interfaces ---

interface Alert {
  _id: string;
  name: string;
  device_id: string;
  alert_type: string;
  condition: {
    operator: string;
    value: number | string | boolean;
  };
  enabled: boolean;
  last_triggered?: string;
  trigger_count: number;
}

interface FormData {
  name: string;
  device_id: string;
  alert_type: string;
  operator: string;
  value: string;
}

// --- Mappings ---

const DEVICE_ALERT_MAP: Record<string, string[]> = {
  'temperature_sensor': ['temperature'],
  'motion_sensor': ['motion'],
  'smoke_detector': ['smoke'],
  'rain_sensor': ['rain'],
  'light': [],
};

const ALERT_TYPE_OPTIONS: Record<string, { label: string, icon: string }> = {
  temperature: { label: 'Temperature', icon: '🌡️' },
  humidity: { label: 'Humidity', icon: '💧' },
  motion: { label: 'Motion', icon: '👁️' },
  smoke: { label: 'Smoke', icon: '🔥' },
  rain: { label: 'Rain', icon: '🌧️' },
  custom: { label: 'Custom', icon: '⚙️' },
};

// --- Main Component ---

export default function AlertsPage() {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [allDevices, setAllDevices] = useState<any[]>([]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editAlert, setEditAlert] = useState<Alert | null>(null);
  const isEditDialogOpen = !!editAlert;

  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Role-based access control
  const canControl = user?.role === 'admin' || user?.role === 'family';
  const isAdmin = user?.role === 'admin';

  const initialFormData: FormData = {
    name: '',
    device_id: '',
    alert_type: 'temperature',
    operator: '>',
    value: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Filtered list of devices that support alerts
  const alertSupportedDevices = allDevices.filter(d => DEVICE_ALERT_MAP[d.device_type]?.length > 0);

  // Checks if the alert type requires a boolean value
  const isBooleanType = (type: string) => {
    return ['motion', 'smoke', 'door_open', 'rain'].includes(type);
  };

  const selectedDevice = allDevices.find(d => d._id === formData.device_id);
  const supportedAlertTypes = selectedDevice
    ? DEVICE_ALERT_MAP[selectedDevice.device_type] || []
    : [];

  const getAlertIcon = (type: string) => {
    return ALERT_TYPE_OPTIONS[type]?.icon || '🔔';
  };

  // --- Data Fetching ---

  useEffect(() => {
    fetchAlerts();
    fetchDevices();
  }, []);

  const fetchAlerts = async () => {
    try {
      // @ts-ignore
      const response = await alertAPI.getAll();
      setAlerts(response.data.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      // @ts-ignore
      const response = await deviceAPI.getAll();
      setAllDevices(response.data.data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  // --- Form Handlers ---

  const handleFormClose = () => {
    setEditAlert(null);
    setIsAddDialogOpen(false);
    setFormData(initialFormData);
  };

  const handleEditStart = (alerts: Alert) => {
    if (!isAdmin) {
      alert('Only administrators can edit alerts');
      return;
    }

    const valueString = alerts.condition.value.toString();

    setFormData({
      name: alert.name,
      device_id: alerts.device_id,
      alert_type: alerts.alert_type,
      operator: alerts.condition.operator,
      value: valueString,
    });
    
    setEditAlert(alerts);
  };

  const handleDeviceChange = (deviceId: string) => {
    const device = allDevices.find(d => d._id === deviceId);
    const supported = device ? DEVICE_ALERT_MAP[device.device_type] || [] : [];

    let newAlertType = initialFormData.alert_type;
    let newOperator = initialFormData.operator;
    let newValue = initialFormData.value;

    if (deviceId && supported.length > 0) {
      newAlertType = supported[0];
      newOperator = isBooleanType(newAlertType) ? '==' : '>';
      newValue = isBooleanType(newAlertType) ? 'true' : '';
    } else if (deviceId && supported.length === 0) {
      newAlertType = 'custom';
      newOperator = '>';
      newValue = '';
    } else {
      newAlertType = initialFormData.alert_type;
      newOperator = initialFormData.operator;
      newValue = initialFormData.value;
    }

    setFormData({
      ...formData,
      device_id: deviceId,
      alert_type: newAlertType,
      operator: newOperator,
      value: newValue,
    });
  };

  const handleAlertTypeChange = (type: string) => {
    setFormData({
      ...formData,
      alert_type: type,
      operator: isBooleanType(type) ? '==' : '>',
      value: isBooleanType(type) ? 'true' : ''
    });
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      alert('Only administrators can create or edit alerts');
      return;
    }

    setLoading(true);

    try {
      let value: number | boolean | string;

      if (isBooleanType(formData.alert_type)) {
        value = formData.value === 'true';
      } else if (formData.alert_type === 'custom') {
        value = formData.value;
      } else {
        value = parseFloat(formData.value);
      }

      const alertData = {
        name: formData.name,
        device_id: formData.device_id,
        alert_type: formData.alert_type,
        condition: {
          operator: formData.operator,
          value: value,
        },
      };

      if (isEditDialogOpen && editAlert) {
        // @ts-ignore
        await alertAPI.update(editAlert._id, alertData);
      } else {
        // @ts-ignore
        await alertAPI.create(alertData);
      }

      await fetchAlerts();
      handleFormClose();
    } catch (error: any) {
      alert(error.response?.data?.message || `Failed to ${isEditDialogOpen ? 'update' : 'add'} alert`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlert = async (alertId: string, currentState: boolean) => {
    if (!isAdmin) {
      alert('Only administrators can toggle alerts');
      return;
    }

    try {
      // @ts-ignore
      await alertAPI.update(alertId, { enabled: !currentState });
      await fetchAlerts();
    } catch (error) {
      alert('Failed to toggle alert');
    }
  };

  const handleDeleteAlert = async () => {
    if (!deleteAlertId || !isAdmin) return;

    try {
      // @ts-ignore
      await alertAPI.delete(deleteAlertId);
      await fetchAlerts();
      setDeleteAlertId(null);
    } catch (error) {
      alert('Failed to delete alert');
    }
  };

  const formatCondition = (alert: Alert) => {
    const { alert_type, condition } = alert;

    if (isBooleanType(alert_type)) {
      const value = typeof condition.value === 'boolean' ? condition.value : condition.value === 'true';
      const typeLabel = ALERT_TYPE_OPTIONS[alert_type]?.label || alert_type;

      let verb = typeLabel === 'Door Open/Closed'
        ? (value ? 'is Open' : 'is Closed')
        : (value ? 'Detected' : 'Not Detected');

      return `When ${typeLabel} ${verb}`;
    }

    return `${alert_type} ${condition.operator} ${condition.value}`;
  };

  // --- Render Function ---

  const renderFormFields = (isEdit: boolean) => (
    <>
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

      {/* Device Select */}
      <div>
        <Label htmlFor="device">Device</Label>
        <Select
          value={formData.device_id}
          onValueChange={handleDeviceChange}
          required
          disabled={isEdit}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select sensor device" />
          </SelectTrigger>
          <SelectContent>
            {alertSupportedDevices.map(device => (
              <SelectItem key={device._id} value={device._id}>
                {getAlertIcon(device.device_type)} {device.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {alertSupportedDevices.length === 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            No devices found that support sensor-based alerts.
          </p>
        )}
      </div>

      {/* Alert Type Select */}
      {formData.device_id && (
        <div>
          <Label htmlFor="alert_type">Alert Type</Label>
          <Select
            key={`alert-type-${formData.device_id}-${formData.alert_type}`}
            value={formData.alert_type}
            onValueChange={handleAlertTypeChange}
            disabled={isEdit || supportedAlertTypes.length <= 1}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sensor type" />
            </SelectTrigger>
            <SelectContent>
              {supportedAlertTypes.length > 0 ? (
                <>
                  {supportedAlertTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {ALERT_TYPE_OPTIONS[type]?.icon} {ALERT_TYPE_OPTIONS[type]?.label}
                    </SelectItem>
                  ))}
                  <SelectItem key="custom" value="custom">
                    {ALERT_TYPE_OPTIONS['custom'].icon} {ALERT_TYPE_OPTIONS['custom'].label}
                  </SelectItem>
                </>
              ) : (
                <SelectItem key="custom" value="custom">
                  {ALERT_TYPE_OPTIONS['custom'].icon} {ALERT_TYPE_OPTIONS['custom'].label}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Condition Inputs */}
      {formData.device_id && (
        <>
          {/* Numeric and Custom alert types */}
          {!(isBooleanType(formData.alert_type)) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="operator">Condition</Label>
                <Select
                  key={`operator-${formData.alert_type}`}
                  value={formData.operator}
                  onValueChange={(value) => setFormData({ ...formData, operator: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">Greater than (&gt;)</SelectItem>
                    <SelectItem value="<">Less than (&lt;)</SelectItem>
                    <SelectItem value=">=">Greater or equal (≥)</SelectItem>
                    <SelectItem value="<=">Less or equal (≤)</SelectItem>
                    <SelectItem value="==">Equal to (=)</SelectItem>
                    <SelectItem value="!=">Not Equal to (!=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  key={`value-${formData.alert_type}`}
                  id="value"
                  type={formData.alert_type === 'custom' ? 'text' : 'number'}
                  step={formData.alert_type === 'custom' ? 'any' : '0.1'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.alert_type === 'custom' ? "e.g., 'raised'" : "e.g., 30"}
                  required
                />
              </div>
            </div>
          )}

          {/* Boolean alert types */}
          {isBooleanType(formData.alert_type) && (
            <div>
              <Label htmlFor="boolean-condition">Trigger When</Label>
              <Select
                value={formData.value}
                onValueChange={(value) => {
                  setFormData({ ...formData, value, operator: '==' });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">
                    {ALERT_TYPE_OPTIONS[formData.alert_type]?.label} Detected/Open
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Get notified when conditions are met</p>
        </div>

        {/* ADD ALERT DIALOG */}
        {isAdmin && (
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              if (!open) handleFormClose();
              else setIsAddDialogOpen(true);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Alert</DialogTitle>
                <DialogDescription>Set up notifications for device sensor conditions</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveAlert}>
                <div className="space-y-4 py-4">
                  {renderFormFields(false)}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleFormClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !formData.device_id}>
                    {loading ? 'Creating...' : 'Create Alert'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* EDIT ALERT DIALOG */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleFormClose();
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Alert</DialogTitle>
              <DialogDescription>
                Editing alert: {editAlert?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveAlert}>
              <div className="space-y-4 py-4">
                {renderFormFields(true)}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleFormClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !formData.device_id}>
                  {loading ? 'Saving...' : 'Save Changes'}
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
                  <div className={`p-3 rounded-lg text-2xl ${alert.enabled ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{alert.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {formatCondition(alert)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant={alert.enabled ? 'default' : 'secondary'}>
                    {alert.enabled ? 'Active' : 'Disabled'}
                  </Badge>

                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStart(alert)}
                      >
                        Edit
                      </Button>

                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={() => handleToggleAlert(alert._id, alert.enabled)}
                      />
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Triggered:</span> {alert.trigger_count} times
                  </p>

                  {alert.last_triggered && (
                    <p>
                      <span className="font-medium">Last:</span> {new Date(alert.last_triggered).toLocaleString()}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteAlertId(alert._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-2">No alerts configured</p>
          <p className="text-muted-foreground mb-6">
            Create alerts to get notified about important events
          </p>
          {isAdmin && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Alert
            </Button>
          )}
        </div>
      )}

      {!canControl && (
        <div className="mt-8 p-4 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            View only - Contact admin to manage alerts
          </p>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAlertId} onOpenChange={() => setDeleteAlertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This alert will be permanently deleted.
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