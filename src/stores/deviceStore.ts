import { create } from 'zustand';
import { Device } from '@/types/device';

interface DeviceState {
  devices: Device[];
  setDevices: (devices: Device[]) => void;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  setDevices: (devices) => set({ devices }),
  updateDevice: (deviceId, updates) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d._id === deviceId ? { ...d, ...updates } : d
      ),
    })),
}));
