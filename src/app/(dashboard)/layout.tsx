'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, login, logout, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand to rehydrate
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return; // Wait for rehydration

    const initAuth = async () => {
      const storedToken = token || localStorage.getItem('token');
      
      if (!storedToken) {
        router.push('/login');
        return;
      }

      // Fetch user if not in store
      if (!user) {
        try {
          const response = await api.get('/api/users/me');
          if (response.data.success) {
            const userData = response.data.data;
            login(storedToken, {
              id: userData._id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
            });
          }
        } catch (error) {
          console.error('Auth failed:', error);
          logout();
          router.push('/login');
          return;
        }
      }

      setLoading(false);
    };

    initAuth();
  }, [hydrated, token, user]);

  if (!hydrated || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}