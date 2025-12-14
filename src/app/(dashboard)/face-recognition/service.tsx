// Add these helper functions to your face recognition page or create a separate utils file

import { authAPI, deviceAPI, faceAPI } from "@/lib/api";

/**
 * Fetch user details from User Service
 */
export async function fetchUserDetails(userId: string) {
  try {
    // const response = await authAPI.getUserbyId(userId);
    // return {
    //   id: response.data.data._id,
    //   name: response.data.data.name,
    //   email: response.data.data.email
    // };
    return null
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Fetch all door locks with room information
 */
export async function fetchDoorLocks() {
  try {
    const response = await deviceAPI.getByType('door_lock');
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching door locks:', error);
    return [];
  }
}

/**
 * Filter doors by allowed rooms and selected room
 */
export function filterDoors(
  allDoors: any[],
  allowedRoomIds: string[],
  selectedRoomId?: string
) {
  return allDoors.filter(door => {
    // Get door's room ID
    const doorRoomId = door.room_id?._id || door.room_id;
    
    if (!doorRoomId) return false;
    
    // Check if door is in allowed rooms
    const isAllowed = allowedRoomIds.includes(String(doorRoomId));
    
    if (!isAllowed) return false;
    
    // If room selected, only include doors from that room
    if (selectedRoomId) {
      return String(doorRoomId) === String(selectedRoomId);
    }
    
    return true;
  });
}

/**
 * Format door lock data for display
 */
export function formatDoorForDisplay(door: any) {
  const roomData = door.room_id;
  
  return {
    _id: door._id,
    name: door.name,
    status: door.status,
    is_locked: door.state?.is_locked ?? true,
    room: {
      id: roomData?._id || roomData || null,
      name: roomData?.name || 'No Room Assigned'
    }
  };
}

/**
 * Group doors by room
 */
export function groupDoorsByRoom(doors: any[]) {
  return doors.reduce((acc, door) => {
    const roomName = door.room?.name || 'No Room';
    if (!acc[roomName]) {
      acc[roomName] = [];
    }
    acc[roomName].push(door);
    return acc;
  }, {} as Record<string, any[]>);
}

/**
 * Handle face enrollment with user data fetch
 */
export async function enrollFaceWithUserData(
  userId: string,
  allowedRooms: string[],
  imageFile: Blob
) {
  // Fetch user details first
  const user = await fetchUserDetails(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Create form data
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('name', user.name);
  formData.append('email', user.email);
  formData.append('allowed_rooms', JSON.stringify(allowedRooms));
  formData.append('image', imageFile, 'face.jpg');
  
  // Enroll face
  const response = await faceAPI.enroll(formData);
  return response.data;
}

/**
 * Handle face verification and door filtering
 */
export async function verifyFaceAndGetDoors(
  imageFile: Blob,
  selectedRoomId?: string
) {
  // 1. Verify face with Face Recognition Service
  const formData = new FormData();
  formData.append('image', imageFile, 'face.jpg');
  if (selectedRoomId) {
    formData.append('room_id', selectedRoomId);
  }
  
  const verifyResponse = await faceAPI.verify(formData);
  const result = verifyResponse.data.data;
  
  if (!result.matched) {
    return {
      matched: false,
      message: result.message,
      available_doors: [],
      total_doors: 0
    };
  }
  
  // 2. Fetch all door locks from Device Service
  const allDoors = await fetchDoorLocks();
  
  // 3. Filter doors by allowed rooms and selected room
  const allowedRoomIds = result.allowed_rooms || [];
  const filteredDoors = filterDoors(allDoors, allowedRoomIds, selectedRoomId);
  
  // 4. Format doors for display
  const formattedDoors = filteredDoors.map(formatDoorForDisplay);
  
  // 5. Return complete result
  return {
    ...result,
    available_doors: formattedDoors,
    total_doors: formattedDoors.length
  };
}

/**
 * Unlock multiple doors
 */
export async function unlockMultipleDoors(doorIds: string[]) {
  const results = await Promise.allSettled(
    doorIds.map(doorId => deviceAPI.control(doorId, 'unlock'))
  );
  
  return results.map((result, index) => ({
    doorId: doorIds[index],
    success: result.status === 'fulfilled',
    message: result.status === 'fulfilled' 
      ? 'Unlocked successfully' 
      : `Failed: ${(result as any).reason?.message || 'Unknown error'}`
  }));
}