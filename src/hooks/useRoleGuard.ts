import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export function useRoleGuard(allowedRoles: string[]) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, allowedRoles, router]);

  return {
    isAllowed: user && allowedRoles.includes(user.role),
    user
  };
}