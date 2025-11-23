import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: any) => api.post('/api/users/register', data),
  login: (data: any) => api.post('/api/users/login', data),
  getProfile: () => api.get('/api/users/profile'),
};

export const deviceAPI = {
  getAll: () => api.get('/api/devices'),
  getOne: (id: string) => api.get(`/api/devices/${id}`),
  create: (data: any) => api.post('/api/devices', data),
  update: (id: string, data: any) => api.put(`/api/devices/${id}`, data),
  delete: (id: string) => api.delete(`/api/devices/${id}`),
  control: (id: string, action: string, params?: any) =>
    api.post(`/api/devices/${id}/control`, { action, ...params }),
  getStats: () => api.get('/api/devices/stats'),
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
  toggle: (id: string) => api.patch(`/api/schedules/${id}/toggle`),
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
  getReadings: (params?: any) => api.get('/api/sensors/readings', { params }),
  getLatest: (deviceId: string) => api.get(`/api/sensors/latest/${deviceId}`),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
};

export const faceAPI = {
  enroll: (formData: FormData) => api.post('/api/face/enroll', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  verify: (formData: FormData) => api.post('/api/face/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getUserFaces: (userId: string) => api.get(`/api/face/user/${userId}`),
  deleteFace: (faceId: string) => api.delete(`/api/face/${faceId}`),
  getStats: () => api.get('/api/face/stats'),
};
