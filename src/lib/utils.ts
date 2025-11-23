import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getDeviceIcon(deviceType: string) {
  const icons: Record<string, string> = {
    light: '💡',
    door_lock: '🔒',
    temperature_sensor: '🌡️',
    motion_sensor: '👁️',
    smoke_detector: '🔥',
    rain_sensor: '🌧️',
    clothes_rack: '👕',
  };
  return icons[deviceType] || '📱';
}
