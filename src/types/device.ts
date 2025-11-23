export type DeviceType = 
  | 'light' 
  | 'door_lock' 
  | 'temperature_sensor' 
  | 'motion_sensor' 
  | 'smoke_detector'
  | 'rain_sensor'
  | 'clothes_rack';

export interface DeviceState {
  is_on?: boolean;
  is_locked?: boolean;
  temperature?: number;
  humidity?: number;
  motion_detected?: boolean;
  smoke_detected?: boolean;
  smoke_level?: number;
  is_raining?: boolean;
  rain_intensity?: number;
  last_rain_detected?: string;
  rack_position?: 'extended' | 'retracted' | 'stopped';
}

export interface Device {
  _id: string;
  name: string;
  device_type: DeviceType;
  mac_address: string;
  room_id?: string;
  user_id: string;
  status: 'online' | 'offline';
  state: DeviceState;
  mqtt_topic: string;
  is_active: boolean;
  last_updated: string;
  created_at: string;
  metadata?: {
    firmware_version?: string;
    ip_address?: string;
    signal_strength?: number;
    battery_level?: number;
  };
}
