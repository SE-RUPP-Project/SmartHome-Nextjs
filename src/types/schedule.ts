export interface Schedule {
  _id: string;
  name: string;
  user_id: string;
  cron_expression: string;
  actions: Array<{
    device_id: string;
    action: string;
    parameters?: any;
  }>;
  is_enabled: boolean;
  last_run?: string;
  next_run?: string;
  run_count: number;
  created_at: string;
}
