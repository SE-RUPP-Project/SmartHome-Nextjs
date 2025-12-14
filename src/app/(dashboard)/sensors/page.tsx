'use client';

import { useState, useEffect } from 'react';
import { sensorAPI, deviceAPI } from '@/lib/api';
import { Thermometer, Droplets, Wind, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface SensorReading {
  _id: string;
  device_id: string;
  sensor_type: string;
  value: number | string | boolean;
  unit?: string;
  timestamp: string;
}

interface Device {
  _id: string;
  name: string;
  device_type: string;
  status: string;
}

export default function SensorsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSensorDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchReadings(selectedDevice);
    }
  }, [selectedDevice]);

  const fetchSensorDevices = async () => {
    try {
      const response = await deviceAPI.getAll();
      const sensorDevices = response.data.data.filter((d: Device) => 
        d.device_type === 'temperature_sensor' || 
        d.device_type === 'motion_sensor' ||
        d.device_type === 'smoke_detector' ||
        d.device_type === 'rain_sensor'
      );
      setDevices(sensorDevices);
      if (sensorDevices.length > 0) {
        setSelectedDevice(sensorDevices[0]._id);
      }
    } catch (error: any) {
      console.error('Error fetching devices:', error);
      setError('Failed to load devices');
    }
  };

  const fetchReadings = async (deviceId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch historical readings (last 20)
      const historyRes = await sensorAPI.getReadings({ 
        device_id: deviceId, 
        limit: 20 
      });

      // Fetch latest single reading
      const latestRes = await sensorAPI.getLatest(deviceId);

      // Reverse to show oldest to newest for chart
      setReadings(historyRes.data.data.reverse());
      setLatestReading(latestRes.data.data);

    } catch (error: any) {
      console.error('Error fetching readings:', error);
      setError('Failed to load sensor data');
      setReadings([]);
      setLatestReading(null);
    } finally {
      setLoading(false);
    }
  };

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature_sensor':
        return <Thermometer className="w-6 h-6" />;
      case 'motion_sensor':
        return <Activity className="w-6 h-6" />;
      case 'rain_sensor':
        return <Droplets className="w-6 h-6" />;
      case 'smoke_detector':
        return <Wind className="w-6 h-6" />;
      default:
        return <Wind className="w-6 h-6" />;
    }
  };

  const getChartData = () => {
    return readings.map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      value: typeof r.value === 'boolean' ? (r.value ? 1 : 0) :
             typeof r.value === 'number' ? r.value : 
             typeof r.value === 'string' && !isNaN(parseFloat(r.value)) ? parseFloat(r.value) : 0,
    }));
  };

  const isBooleanSensor = () => {
    return readings.length > 0 && typeof readings[0].value === 'boolean';
  };

  const selectedDeviceData = devices.find(d => d._id === selectedDevice);

  // Format value display
  const formatValue = (value: any, unit?: string) => {
    if (typeof value === 'boolean') {
      return value ? 'Detected' : 'Not Detected';
    }
    if (typeof value === 'number') {
      return `${value}${unit || ''}`;
    }
    return `${value}${unit || ''}`;
  };

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Sensors</h1>
        <p className="text-muted-foreground">Monitor your sensor data in real-time</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Device Selection */}
      <div className="mb-6">
        <Select value={selectedDevice} onValueChange={setSelectedDevice}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a sensor" />
          </SelectTrigger>
          <SelectContent>
            {devices.map(device => (
              <SelectItem key={device._id} value={device._id}>
                {device.name} ({device.device_type.replace(/_/g, ' ')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-12">
          <Thermometer className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No sensor devices found</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading sensor data...</p>
        </div>
      ) : (
        <>
          {/* Current Reading */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Current Reading</CardTitle>
                  {selectedDeviceData && (
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getSensorIcon(selectedDeviceData.device_type)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {latestReading ? (
                  <>
                    <div className="text-3xl font-bold">
                      {formatValue(latestReading.value, latestReading.unit)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Last updated: {new Date(latestReading.timestamp).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Device Status</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDeviceData && (
                  <>
                    <Badge variant={selectedDeviceData.status === 'online' ? 'default' : 'secondary'}>
                      {selectedDeviceData.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Device is {selectedDeviceData.status}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{readings.length}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Recent readings collected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Historical Data</CardTitle>
              <CardDescription>Last 20 readings</CardDescription>
            </CardHeader>
            <CardContent>
              {readings.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis 
                      domain={isBooleanSensor() ? [0, 1] : ['auto', 'auto']}
                      ticks={isBooleanSensor() ? [0, 1] : undefined}
                      tickFormatter={isBooleanSensor() ? (value) => value === 1 ? 'Detected' : 'Not Detected' : undefined}
                    />
                    <Tooltip 
                      formatter={(value: any) => {
                        if (isBooleanSensor()) {
                          return value === 1 ? 'Detected' : 'Not Detected';
                        }
                        return value;
                      }}
                    />
                    <Line 
                      type={isBooleanSensor() ? "stepAfter" : "monotone"}
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Readings Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Readings</CardTitle>
            </CardHeader>
            <CardContent>
              {readings.length > 0 ? (
                <div className="space-y-2">
                  {readings.map((reading) => (
                    <div key={reading._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {formatValue(reading.value, reading.unit)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(reading.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">{reading.sensor_type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No readings available</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


// ==========================================
// SUMMARY OF UPDATES
// ==========================================

/*
BOOLEAN SENSOR CHART SUPPORT:

1. getChartData() enhancement:
   - Converts boolean true → 1, false → 0
   - Maintains support for numeric sensors
   - Handles string numbers as fallback

2. isBooleanSensor() helper:
   - Detects if current sensor returns boolean values
   - Used to customize chart appearance

3. Chart customization for boolean sensors:
   - YAxis domain: Fixed to [0, 1]
   - YAxis ticks: Shows only 0 and 1
   - YAxis labels: "Detected" / "Not Detected"
   - Line type: "stepAfter" for clear state changes
   - Tooltip: Shows meaningful text instead of numbers

4. Visual representation:
   - Rain sensor (true) shows as horizontal line at "Detected"
   - State changes appear as clear steps
   - Easy to see when sensor state changes over time

SUPPORTED SENSOR TYPES:
✅ Temperature (numeric)
✅ Motion (boolean)
✅ Rain (boolean)
✅ Smoke (boolean)
*/