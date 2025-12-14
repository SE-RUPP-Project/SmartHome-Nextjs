'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, DoorOpen, Calendar, Bell, Activity, BarChart3, Camera, Thermometer, Settings, User, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'family', 'guest'] },
  { href: '/devices', label: 'Devices', icon: Zap, roles: ['admin', 'family', 'guest'] },
  { href: '/rooms', label: 'Rooms', icon: DoorOpen, roles: ['admin', 'family', 'guest'] },
  { href: '/schedules', label: 'Schedules', icon: Calendar, roles: ['admin', 'family'] },
  { href: '/alerts', label: 'Alerts', icon: Bell, roles: ['admin', 'family'] },
  { href: '/sensors', label: 'Sensors', icon: Thermometer, roles: ['admin', 'family'] },
  { href: '/events', label: 'Events', icon: Activity, roles: ['admin', 'family'] },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'family'] },
  { href: '/face-recognition', label: 'Face ID', icon: Camera, roles: ['admin'] },
  { href: '/user-management', label: 'Users', icon: User, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'family', 'guest'] },
];  

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('guest');

  // Update userRole when user changes, with fallback
  useEffect(() => {
    if (user?.role) {
      setUserRole(user.role);
    }
  }, [user?.role]);

  // Filter nav items based on user role
  const accessibleItems = navItems.filter(item => item.roles.includes(userRole));

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button - Shows only on mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border shadow-md"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base styles
          "border-r bg-muted/10",
          // Mobile styles - fixed overlay sidebar
          "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop styles - static sidebar
          "md:relative md:translate-x-0"
        )}
      >
        <nav className={`p-4 space-y-1 h-full overflow-y-auto ${isMobileMenuOpen ? 'bg-white pt-20' : ''}`}>
          {accessibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}