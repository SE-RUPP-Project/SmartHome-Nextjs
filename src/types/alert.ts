export interface Alert {
  _id: string;
  name: string;
  user_id: string;
  device_id: string;
  alert_type: 'temperature' | 'humidity' | 'motion' | 'smoke' | 'door_open' | 'custom';
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number | string | boolean;
  };
  enabled: boolean;
  notification_method: 'email' | 'push' | 'sms' | 'all';
  last_triggered?: string;
  trigger_count: number;
  created_at: string;
}
