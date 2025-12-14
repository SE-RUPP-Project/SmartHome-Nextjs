// hooks/usePushNotifications.ts
import { useState, useEffect } from 'react';
import { requestFCMToken, onForegroundMessage } from '@/lib/firebase';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface PushNotificationPayload {
  notification?: {
    title: string;
    body: string;
    icon?: string;
  };
  data?: {
    alert_id?: string;
    event_id?: string;
    severity?: string;
    type?: string;
  };
}

export const usePushNotifications = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if notifications are supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Auto-load existing token if permission already granted
      if (Notification.permission === 'granted') {
        loadExistingToken();
      }
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload: PushNotificationPayload) => {
      console.log('Foreground notification received:', payload);
      
      // Show toast notification
      const title = payload.notification?.title || 'New Notification';
      const body = payload.notification?.body || '';
      
      toast(title, {
        description: body,
        duration: 5000,
        action: payload.data?.alert_id ? {
          label: 'View',
          onClick: () => {
            window.location.href = `/alerts/${payload?.data?.alert_id}`;
          }
        } : undefined
      });

      // Also show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: payload.notification?.icon || '/icons/alert.png',
          badge: '/icons/badge.png',
          data: payload.data,
          tag: payload.data?.alert_id || 'notification',
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isSupported]);

  /**
   * Load existing FCM token if already granted
   */
  const loadExistingToken = async (): Promise<void> => {
    try {
      const token = await requestFCMToken();
      if (token) {
        setFcmToken(token);
        // Verify token is still valid on backend
        await verifyAndSaveToken(token);
      }
    } catch (error) {
      console.error('Error loading existing token:', error);
    }
  };

  /**
   * Request notification permission and get FCM token
   * @param forceRefresh - Force refresh the token even if one exists
   */
  const requestPermission = async (forceRefresh: boolean = false): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Notifications are not supported in this browser');
      return false;
    }

    try {
      // Get new token (or refresh existing one)
      const token = await requestFCMToken();
      
      if (token) {
        setFcmToken(token);
        setPermission(Notification.permission);
        
        // Save/update token to backend
        await saveFCMToken(token);
        
        return true;
      } else {
        toast.error('Failed to get notification token');
        return false;
      }
    } catch (error: any) {
      console.error('Error requesting notification permission:', error);
      
      // Handle specific error cases
      if (error.message?.includes('permission')) {
        toast.error('Notification permission denied. Please enable in browser settings.');
      } else {
        toast.error('Failed to enable push notifications');
      }
      
      return false;
    }
  };

  /**
   * Verify token is valid and save to backend
   */
  const verifyAndSaveToken = async (token: string): Promise<void> => {
    try {
      await api.post('/api/users/me/fcm-token', { fcm_token: token });
      console.log('FCM token verified and saved to backend');
    } catch (error: any) {
      console.error('Error verifying FCM token:', error);
      
      // If token is invalid on backend, request a new one
      if (error.response?.status === 400 || error.response?.data?.message?.includes('invalid')) {
        console.log('Token invalid, requesting new token...');
        await requestPermission(true);
      }
    }
  };

  /**
   * Save FCM token to backend
   */
  const saveFCMToken = async (token: string): Promise<void> => {
    try {
      const response = await api.post('/api/users/me/fcm-token', { fcm_token: token });
      console.log('FCM token saved to backend:', response.data);
    } catch (error: any) {
      console.error('Error saving FCM token:', error);
      
      // Show user-friendly error message
      if (error.response?.status === 400) {
        toast.error('Invalid notification token. Please try again.');
      } else {
        toast.error('Failed to save notification settings');
      }
      
      throw error; // Re-throw to handle in calling function
    }
  };

  /**
   * Remove FCM token from backend and clear local state
   */
  const removeFCMToken = async (): Promise<void> => {
    if (!fcmToken) {
      console.log('No FCM token to remove');
      return;
    }

    try {
      await api.delete('/api/users/me/fcm-token', { data: { fcm_token: fcmToken } });
      setFcmToken(null);
      console.log('FCM token removed from backend');
    } catch (error: any) {
      console.error('Error removing FCM token:', error);
      
      // Even if backend fails, clear local token
      setFcmToken(null);
      
      // Don't show error to user if token was already invalid
      if (error.response?.status !== 404) {
        toast.error('Failed to disable push notifications');
      }
    }
  };

  /**
   * Refresh FCM token (useful when token becomes invalid)
   */
  const refreshToken = async (): Promise<boolean> => {
    console.log('Refreshing FCM token...');
    
    // Remove old token first
    if (fcmToken) {
      await removeFCMToken();
    }
    
    // Request new token
    return await requestPermission(true);
  };

  return {
    isSupported,
    permission,
    fcmToken,
    requestPermission,
    removeFCMToken,
    refreshToken, // New method to force refresh
  };
};