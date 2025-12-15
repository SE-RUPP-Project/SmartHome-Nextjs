'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Home className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Smart Home</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* <span className="text-sm">Hi, {user?.name}!</span> */}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
