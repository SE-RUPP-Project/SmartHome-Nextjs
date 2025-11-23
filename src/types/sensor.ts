export interface SensorReading {
  _id: string;
  device_id: string;
  user_id: string;
  sensor_type: string;
  value: number | string | boolean;
  unit?: string;
  timestamp: string;
  created_at: string;
}
