// AlertForm.tsx

import { Plus, Trash2, AlertCircle } from 'lucide-react';

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// --- Interfaces and Mappings (Keep these the same) ---
interface FormData {
    name: string;
    device_id: string;
    alert_type: string;
    operator: string;
    value: string;
}

interface AlertFormProps {
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    handleDeviceChange: (deviceId: string) => void;
    handleAlertTypeChange: (type: string) => void;
    handleSaveAlert: (e: React.FormEvent) => void;
    handleFormClose: () => void;
    loading: boolean;
    isEditDialogOpen: boolean;
    alertSupportedDevices: any[];
    selectedDevice: any;
    supportedAlertTypes: string[];
    isBooleanType: (type: string) => boolean;
    getAlertIcon: (type: string) => string;
}

const DEVICE_ALERT_MAP: Record<string, string[]> = {
    'temperature_sensor': ['temperature', 'humidity'],
    'motion_sensor': ['motion'],
    'smoke_detector': ['smoke'],
    // 'door_lock': ['door_open'], 
    'rain_sensor': ['rain'],
    'clothes_rack': ['rain'], 
    'light': [], 
};

const ALERT_TYPE_OPTIONS: Record<string, { label: string, icon: string }> = {
    temperature: { label: 'Temperature', icon: '🌡️' },
    humidity: { label: 'Humidity', icon: '💧' },
    motion: { label: 'Motion', icon: '👁️' },
    smoke: { label: 'Smoke', icon: '🔥' },
    door_open: { label: 'Door Open/Closed', icon: '🚪' },
    rain: { label: 'Rain', icon: '🌧️' },
    custom: { label: 'Custom', icon: '⚙️' },
};


export function AlertForm({
    formData,
    setFormData,
    handleDeviceChange,
    handleAlertTypeChange,
    handleSaveAlert,
    handleFormClose,
    loading,
    isEditDialogOpen,
    alertSupportedDevices,
    selectedDevice,
    supportedAlertTypes,
    isBooleanType,
    getAlertIcon,
}: AlertFormProps) {
    
    return (
        <form onSubmit={handleSaveAlert}>
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
                
                {/* Device Select - Filtered to sensor devices */}
                <div>
                    <Label htmlFor="device">Device</Label>
                    <Select
                        value={formData.device_id}
                        onValueChange={handleDeviceChange}
                        required
                        // Device is disabled in both Add (after selection) and Edit modes
                        disabled={isEditDialogOpen}
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
                
                {/* Alert Type Select - Conditional based on Device */}
                {formData.device_id && supportedAlertTypes.length > 0 && (
                    <div>
                        <Label htmlFor="alert_type">Alert Type</Label>
                        <Select
                            value={formData.alert_type}
                            onValueChange={handleAlertTypeChange}
                            // Alert Type is disabled in Edit mode, or if only one type is supported
                            disabled={isEditDialogOpen || supportedAlertTypes.length <= 1} 
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select sensor type" />
                            </SelectTrigger>
                            <SelectContent>
                                {supportedAlertTypes.map(type => (
                                    <SelectItem key={type} value={type}>
                                        {ALERT_TYPE_OPTIONS[type]?.icon} {ALERT_TYPE_OPTIONS[type]?.label}
                                    </SelectItem>
                                ))}
                                {/* Added 'custom' to the options list */}
                                <SelectItem key="custom" value="custom">
                                    {ALERT_TYPE_OPTIONS['custom'].icon} {ALERT_TYPE_OPTIONS['custom'].label}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                {/* Condition Inputs */}
                {formData.device_id && supportedAlertTypes.length > 0 && (
                    <>
                        {/* Numeric and Custom alert types */}
                        {!(isBooleanType(formData.alert_type)) && (
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
                                        <SelectItem value="false">
                                            {ALERT_TYPE_OPTIONS[formData.alert_type]?.label} Not Detected/Closed
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </>
                )}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={handleFormClose}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading || !formData.device_id}>
                    {loading 
                        ? (isEditDialogOpen ? 'Saving...' : 'Creating...') 
                        : (isEditDialogOpen ? 'Save Changes' : 'Create Alert')
                    }
                </Button>
            </DialogFooter>
        </form>
    );
}

// Export AlertForm to be used by other components
// export default AlertForm; // (or just export as named export)