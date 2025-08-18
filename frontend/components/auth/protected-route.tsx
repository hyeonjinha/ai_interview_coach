'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Loading } from '@/components/ui/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user, token } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 토큰 확인
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken || !savedUser) {
      router.push('/login');
      return;
    }

    // Zustand 스토어와 로컬 스토리지가 동기화되어 있는지 확인
    if (!isAuthenticated || !user || !token) {
      try {
        const parsedUser = JSON.parse(savedUser);
        useAuthStore.getState().setAuth(parsedUser, savedToken);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        router.push('/login');
        return;
      }
    }

    setIsLoading(false);
  }, [isAuthenticated, user, token, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="로딩 중..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

