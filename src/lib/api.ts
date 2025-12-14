import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or request has already been retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    if (typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refreshToken');

      // No refresh token, logout immediately
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('token');
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        if (response.data.success) {
          const newToken = response.data.data.token;

          // Update token in localStorage and auth store
          localStorage.setItem('token', newToken);
          useAuthStore.getState().updateToken(newToken);

          // Update authorization header
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Process queued requests
          processQueue(null, newToken);
          isRefreshing = false;

          // Retry original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: any) => api.post('/api/auth/register', data),
  login: (data: any) => api.post('/api/auth/login', data),
  refresh: (data: any) => api.post('/api/auth/refresh', data),
  logout: () => api.post('/api/auth/logout'),
  changePassword: (data: any) => api.put('/api/auth/password', data),
};

export const userAPI = {
  // Get all users with pagination and filters (Admin only)
  getAll: (params?: string) => api.get(`/api/users?${params || ''}`),
  getUsers: (params?: string) => api.get(`/api/users/all?${params || ''}`),
  
  // Get user by ID (Admin only)
  getOne: (id: string) => api.get(`/api/users/${id}`),
  
  // Update user by ID (Admin only)
  update: (id: string, data: any) => api.put(`/api/users/${id}`, data),
  
  // Delete user by ID (Admin only)
  delete: (id: string) => api.delete(`/api/users/${id}`),
  
  // Get current user profile
  getMe: () => api.get('/api/users/me'),
  
  // Update current user profile
  updateMe: (data: any) => api.put('/api/users/me', data),
  
  // Delete own account
  deleteMe: () => api.delete('/api/users/me'),
  
  // Get notification preferences
  getNotifications: () => api.get('/api/users/me/notifications'),
  
  // Update notification preferences
  updateNotifications: (data: any) => api.put('/api/users/me/notifications', data),
  
  // Save FCM token for push notifications
  saveFCMToken: (data: { fcm_token: string; device_info?: string }) => 
    api.post('/api/users/me/fcm-token', data),
  
  // Remove FCM token
  removeFCMToken: (data: { fcm_token: string }) => 
    api.delete('/api/users/me/fcm-token', { data }),
  
  // Get list of active users
  getList: (params?: { is_active?: boolean }) => 
    api.get('/api/users/list', { params }),
};

export const deviceAPI = {
  getAll: (params: any = {}) => api.get('/api/devices', { params }),
  getOne: (id: string) => api.get(`/api/devices/${id}`),
  create: (data: any) => api.post('/api/devices', data),
  update: (id: string, data: any) => api.put(`/api/devices/${id}`, data),
  delete: (id: string) => api.delete(`/api/devices/${id}`),
  control: (id: string, action: string, params?: any) =>
    api.post(`/api/devices/${id}/control`, { action, ...params }),
  getStats: () => api.get('/api/devices/stats'),
  getByType: (type: string) => api.get(`/api/devices/type/${type}`),
};

export const roomAPI = {
  getAll: () => api.get('/api/rooms'),
  getOne: (id: string) => api.get(`/api/rooms/${id}`),
  create: (data: any) => api.post('/api/rooms', data),
  update: (id: string, data: any) => api.put(`/api/rooms/${id}`, data),
  delete: (id: string) => api.delete(`/api/rooms/${id}`),
};

export const scheduleAPI = {
  getAll: () => api.get('/api/schedules'),
  create: (data: any) => api.post('/api/schedules', data),
  update: (id: string, data: any) => api.put(`/api/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/api/schedules/${id}`),
};

export const alertAPI = {
  getAll: () => api.get('/api/alerts'),
  create: (data: any) => api.post('/api/alerts', data),
  update: (id: string, data: any) => api.put(`/api/alerts/${id}`, data),
  delete: (id: string) => api.delete(`/api/alerts/${id}`),
  getStats: () => api.get('/api/alerts/stats'),
};

export const eventAPI = {
  getAll: (params?: any) => api.get('/api/events', { params }),
};

export const sensorAPI = {
  // Get historical readings with filters
  getReadings: (params?: {
    device_id?: string;
    sensor_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) => api.get('/api/sensors', { params }),

  // Get latest reading for ONE specific device
  getLatest: (deviceId: string) =>
    api.get(`/api/sensors/latest/${deviceId}`),

  // Get latest readings for ALL devices (or filtered by device_id)
  getLatestAll: (deviceId?: string) =>
    api.get('/api/sensors/latest', { params: deviceId ? { device_id: deviceId } : {} }),

  // Get analytics
  getAnalytics: (params: {
    device_id: string;
    sensor_type: string;
    hours?: number;
  }) => api.get('/api/sensors/analytics', { params }),
};

// lib/api.js or services/analytics.api.js

export const analyticsAPI = {
  /**
   * Get dashboard analytics
   * @param {number} days - Number of days to look back (default: 7)
   */
  getDashboard: (days = 7) => {
    return api.get('/api/analytics/dashboard', {
      params: { days }
    });
  },

  /**
   * Get device activity timeline
   * @param {number} hours - Number of hours to look back (default: 24)
   */
  getActivity: (hours = 24) => {
    return api.get('/api/analytics/activity', {
      params: { hours }
    });
  },

  /**
   * Get temperature trends for a device
   * @param {string} deviceId - Device ID
   * @param {number} hours - Number of hours to look back (default: 24)
   */
  getTemperatureTrends: (deviceId: string, hours = 24) => {
    return api.get(`/api/analytics/temperature/${deviceId}`, {
      params: { hours }
    });
  },

  /**
   * Get critical events
   * @param {number} limit - Maximum number of events to return (default: 20)
   */
  getCriticalEvents: (limit = 20) => {
    return api.get('/api/analytics/critical-events', {
      params: { limit }
    });
  },

  /**
   * Get sensor summary
   */
  getSensorSummary: () => {
    return api.get('/api/analytics/sensors');
  }
};

export const faceAPI = {
  enroll: (formData: FormData) => api.post('/api/faces/enroll', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  verify: (formData: FormData) => api.post('/api/faces/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getUserFaces: () => api.get(`/api/faces/all`),
  deleteFace: (faceId: string) => api.delete(`/api/faces/${faceId}`),
  getStats: () => api.get('/api/faces/stats'),
  updateFace: (faceId: string, formData: FormData) => api.put(`/api/faces/${faceId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFaceDetails: (faceId: string) =>
    api.get(`/api/faces/user/${faceId}`)

}

