// frontend-shadcn/src/hooks/useRooms.ts

'use client';

import { useState, useCallback } from 'react';
import { roomAPI } from '@/lib/api';

export function useRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await roomAPI.getAll();
      setRooms(response.data.data);
      console.log('Rooms fetched:', response.data.data);
    } catch (error) {
      console.error('Error fetching Rooms:', error);
    } finally {
      setLoading(false);
    }
  }, []);


  return {
    rooms,
    setRooms,  // ✅ Export setRooms for WebSocket updates
    loading,
    fetchRooms,
  };
}
