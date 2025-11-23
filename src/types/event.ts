export interface Event {
  _id: string;
  event_type: string;
  user_id: string;
  device_id?: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata?: any;
  created_at: string;
}
