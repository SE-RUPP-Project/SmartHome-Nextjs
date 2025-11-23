'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, DoorOpen, Calendar, Bell, Activity, BarChart3, Camera, Thermometer, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/devices', label: 'Devices', icon: Zap },
  { href: '/rooms', label: 'Rooms', icon: DoorOpen },
  { href: '/schedules', label: 'Schedules', icon: Calendar },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/sensors', label: 'Sensors', icon: Thermometer },
  { href: '/events', label: 'Events', icon: Activity },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/face-recognition', label: 'Face ID', icon: Camera },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/10">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
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
  );
}
