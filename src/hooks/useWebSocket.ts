// frontend-shadcn/src/hooks/useWebSocket.ts

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner'; // ✅ ADD: npm install sonner

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3009';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    console.log('🔌 Connecting to WebSocket:', WS_URL);
    
    const socket = io(WS_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      setIsConnected(true);
    });

    // ✅ NEW: Listen for alerts
    socket.on('alert:triggered', (data: any) => {
      console.log('🚨 Alert received:', data);
      handleAlert(data);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      setIsConnected(false);
    });

    return () => {
      console.log('🔌 Disconnecting WebSocket');
      socket.disconnect();
    };
  }, [token]);

  // ✅ NEW: Handle alert notifications
  const handleAlert = (alertData: any) => {
    const severity = alertData.severity || 'info';
    const message = alertData.message;
    
    // Show toast based on severity
    switch (severity) {
      case 'critical':
        toast.error(message, {
          duration: 10000,
          description: `From: ${alertData.device_name}`,
          action: {
            label: 'View',
            onClick: () => window.location.href = '/alerts'
          }
        });
        // Play sound for critical alerts
        playAlertSound('critical');
        break;
        
      case 'warning':
        toast.warning(message, {
          duration: 5000,
          description: `From: ${alertData.device_name}`
        });
        playAlertSound('warning');
        break;
        
      default:
        toast.info(message, {
          duration: 3000,
          description: `From: ${alertData.device_name}`
        });
    }
    
    // Browser notification for critical alerts
    if (severity === 'critical' && Notification.permission === 'granted') {
      new Notification(message, {
        body: `From: ${alertData.device_name}`,
        icon: '/icon.png',
        tag: alertData.alert_id
      });
    }
  };

  // ✅ NEW: Play alert sound
  const playAlertSound = (severity: string) => {
    try {
      let soundFile = '/sounds/notification.mp3';
      if (severity === 'critical') {
        soundFile = '/sounds/alarm.mp3';
      } else if (severity === 'warning') {
        soundFile = '/sounds/warning.mp3';
      }
      
      const audio = new Audio(soundFile);
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (error) {
      console.log('Sound playback not supported');
    }
  };

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketRef.current) {
      console.warn('⚠️ Socket not initialized');
      return () => {};
    }

    console.log(`📡 Subscribing to: ${event}`);
    socketRef.current.on(event, callback);

    return () => {
      if (socketRef.current) {
        console.log(`📡 Unsubscribing from: ${event}`);
        socketRef.current.off(event, callback);
      }
    };
  }, []);

  const emit = (event: string, data?: any) => {
    if (socketRef.current && socketRef.current.connected) {
      console.log(`📤 Emitting: ${event}`, data);
      socketRef.current.emit(event, data);
    } else {
      console.warn('⚠️ Cannot emit, socket not connected');
    }
  };

  return { isConnected, on, emit, socket: socketRef.current };
}
