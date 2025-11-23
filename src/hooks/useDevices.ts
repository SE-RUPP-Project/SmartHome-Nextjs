'use client';

import { useEffect, useCallback } from 'react';
import { useDeviceStore } from '@/stores/deviceStore';
import { deviceAPI } from '@/lib/api';

export function useDevices() {
  const { devices, setDevices, updateDevice } = useDeviceStore();

  const fetchDevices = useCallback(async () => {
    try {
      const response = await deviceAPI.getAll();
      setDevices(response.data.data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  }, [setDevices]);

  const controlDevice = useCallback(async (
    deviceId: string,
    action: string,
    params?: any
  ) => {
    try {
      const response = await deviceAPI.control(deviceId, action, params);
      updateDevice(deviceId, response.data.data);
    } catch (error) {
      console.error('Error controlling device:', error);
      throw error;
    }
  }, [updateDevice]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return { devices, fetchDevices, controlDevice };
}
