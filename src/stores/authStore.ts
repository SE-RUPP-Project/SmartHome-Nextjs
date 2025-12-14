import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (user: User) => void;
  updateToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      login: (token, user, refreshToken) => {
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ 
          token, 
          refreshToken: refreshToken || null,
          user, 
          isAuthenticated: true, 
          isLoading: false  
        });
      },
      
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({ 
          token: null, 
          refreshToken: null,
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      updateUser: (user) => set({ user }),
      
      updateToken: (token) => {
        localStorage.setItem('token', token);
        set({ token });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
    }
  )
);