// frontend-shadcn/src/hooks/useDevices.ts

'use client';

import { useState, useCallback } from 'react';
import { deviceAPI } from '@/lib/api';

export function useDevices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await deviceAPI.getAll();
      setDevices(response.data.data);
      console.log('Devices fetched:', response.data.data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const controlDevice = async (deviceId: string, action: string, parameters?: any) => {
    try {
      await deviceAPI.control(deviceId, action, parameters);
      await fetchDevices();
      // State will be updated via WebSocket
    } catch (error) {
      console.error('Control error:', error);
      throw error;
    }
  };

  return {
    devices,
    setDevices,  // ✅ Export setDevices for WebSocket updates
    loading,
    fetchDevices,
    controlDevice
  };
}
