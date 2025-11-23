'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3009';

export function useWebSocket(onMessage: (data: any) => void) {
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const socket = io(WS_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => console.log('✅ WebSocket connected'));
    socket.on('device_update', (data) => onMessage({ type: 'device_update', ...data }));
    socket.on('alert', (data) => onMessage({ type: 'alert', ...data }));
    socket.on('disconnect', () => console.log('❌ WebSocket disconnected'));

    return () => { socket.disconnect(); };
  }, [token, onMessage]);

  return socketRef.current;
}
