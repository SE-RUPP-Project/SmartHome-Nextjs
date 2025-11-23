import { create } from 'zustand';
import { Room } from '@/types/room';

interface RoomState {
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
}));
